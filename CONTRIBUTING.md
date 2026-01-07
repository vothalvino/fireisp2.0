# Contributing to FireISP 2.0

Thank you for your interest in contributing to FireISP 2.0! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Keep discussions professional

## How to Contribute

### Reporting Bugs

1. Check if the bug is already reported in Issues
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - System information (OS, Docker version, etc.)
   - Relevant logs

### Suggesting Features

1. Check existing feature requests
2. Create a new issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Possible implementation approach

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test thoroughly
5. Commit with clear messages
6. Push to your fork
7. Create a Pull Request

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- Git

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/vothalvino/fireisp2.0.git
cd fireisp2.0
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Start development environment:
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Project Structure

```
fireisp2.0/
├── backend/              # Node.js/Express backend
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── controllers/ # Business logic
│   │   ├── models/      # Database models
│   │   ├── middleware/  # Express middleware
│   │   └── utils/       # Utility functions
│   ├── server.js        # Entry point
│   └── package.json
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   └── utils/       # Utilities
│   └── package.json
├── database/            # Database migrations
│   └── init/           # Initial schema
├── radius/             # FreeRADIUS config
├── nginx/              # Nginx config
└── docker-compose.yml  # Docker setup
```

## Coding Standards

### Backend (Node.js)

- Use modern JavaScript (ES6+)
- Use async/await for asynchronous code
- Follow REST API conventions
- Add error handling
- Write meaningful comments
- Use environment variables for config

Example:
```javascript
// Good
const getClients = async (req, res) => {
  try {
    const clients = await db.query('SELECT * FROM clients');
    res.json(clients.rows);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
};

// Bad
const getClients = (req, res) => {
  db.query('SELECT * FROM clients', (err, result) => {
    if (err) throw err;
    res.json(result);
  });
};
```

### Frontend (React)

- Use functional components with hooks
- Keep components small and focused
- Use meaningful variable names
- Add PropTypes or TypeScript
- Follow React best practices

Example:
```jsx
// Good
function ClientCard({ client }) {
  const [loading, setLoading] = useState(false);
  
  const handleUpdate = async () => {
    setLoading(true);
    try {
      await updateClient(client.id, data);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="card">
      <h3>{client.name}</h3>
      <button onClick={handleUpdate} disabled={loading}>
        {loading ? 'Updating...' : 'Update'}
      </button>
    </div>
  );
}
```

### Database

- Use prepared statements (prevent SQL injection)
- Add indexes for frequently queried fields
- Use transactions for related operations
- Write clear migration scripts

### CSS

- Use CSS variables for theming
- Follow BEM or similar naming convention
- Keep styles modular
- Use responsive design

## Testing

### Manual Testing

1. Test all new features
2. Test edge cases
3. Test on different screen sizes
4. Check browser console for errors
5. Verify database changes

### Automated Testing (future)

- Write unit tests for business logic
- Write integration tests for APIs
- Write E2E tests for critical flows

## Commit Messages

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```
feat(clients): add client export functionality
fix(radius): correct NAS authentication
docs(readme): update installation steps
```

## Pull Request Process

1. Update documentation if needed
2. Update CHANGELOG.md
3. Ensure all tests pass
4. Get at least one code review
5. Squash commits if requested
6. Merge when approved

## Security

- Never commit sensitive data (passwords, keys)
- Use environment variables
- Validate all user input
- Use parameterized queries
- Keep dependencies updated
- Report security issues privately

## Questions?

- Open an issue for discussion
- Join our community chat (if available)
- Check existing documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for contributing! 🚀
