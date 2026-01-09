const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const db = require('../utils/database');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const clientId = req.params.clientId;
        const uploadPath = path.join(__dirname, '../../uploads/clients', clientId);
        
        // Create directory if it doesn't exist
        try {
            await fs.mkdir(uploadPath, { recursive: true });
            cb(null, uploadPath);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp and random string
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        cb(null, basename + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow common document types
        const allowedMimes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, images, Word, Excel, and text files are allowed.'));
        }
    }
});

// Upload document for a client
router.post('/:clientId/upload', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: { message: 'No file uploaded' } });
        }

        const clientId = req.params.clientId;
        
        // Verify client exists
        const clientCheck = await db.query('SELECT id FROM clients WHERE id = $1', [clientId]);
        if (clientCheck.rows.length === 0) {
            // Delete uploaded file if client doesn't exist
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(404).json({ error: { message: 'Client not found' } });
        }

        // Store document metadata in database
        const filePath = `clients/${clientId}/${req.file.filename}`;
        const result = await db.query(
            `INSERT INTO client_documents (
                client_id, filename, original_filename, file_path, file_size, mime_type, uploaded_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
                clientId,
                req.file.filename,
                req.file.originalname,
                filePath,
                req.file.size,
                req.file.mimetype,
                req.user.id
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Upload document error:', error);
        // Clean up file if database insert fails
        if (req.file && req.file.path) {
            await fs.unlink(req.file.path).catch(() => {});
        }
        res.status(500).json({ error: { message: 'Failed to upload document' } });
    }
});

// Get all documents for a client
router.get('/:clientId', async (req, res) => {
    try {
        const clientId = req.params.clientId;
        
        const result = await db.query(
            `SELECT d.*, u.username as uploaded_by_name
             FROM client_documents d
             LEFT JOIN users u ON d.uploaded_by = u.id
             WHERE d.client_id = $1
             ORDER BY d.created_at DESC`,
            [clientId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get documents error:', error);
        res.status(500).json({ error: { message: 'Failed to get documents' } });
    }
});

// Download a document
router.get('/:clientId/download/:documentId', async (req, res) => {
    try {
        const { clientId, documentId } = req.params;
        
        const result = await db.query(
            'SELECT * FROM client_documents WHERE id = $1 AND client_id = $2',
            [documentId, clientId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Document not found' } });
        }

        const document = result.rows[0];
        const filePath = path.join(__dirname, '../../uploads', document.file_path);

        // Check if file exists before attempting download
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({ error: { message: 'File not found on disk' } });
        }

        res.download(filePath, document.original_filename);
    } catch (error) {
        console.error('Download document error:', error);
        res.status(500).json({ error: { message: 'Failed to download document' } });
    }
});

// Delete a document
router.delete('/:clientId/:documentId', async (req, res) => {
    try {
        const { clientId, documentId } = req.params;
        
        const result = await db.query(
            'SELECT * FROM client_documents WHERE id = $1 AND client_id = $2',
            [documentId, clientId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: { message: 'Document not found' } });
        }

        const document = result.rows[0];
        const filePath = path.join(__dirname, '../../uploads', document.file_path);

        // Delete from database first
        await db.query('DELETE FROM client_documents WHERE id = $1', [documentId]);

        // Then delete file from disk (ignore errors if file doesn't exist)
        await fs.unlink(filePath).catch(() => {});

        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ error: { message: 'Failed to delete document' } });
    }
});

module.exports = router;
