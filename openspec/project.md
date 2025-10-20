# Project Context

## Purpose
This project manages Cloudflare redirects using OpenSpec for specification-driven development. It provides tools and workflows for creating, updating, and managing URL redirection rules on Cloudflare, ensuring changes are properly specified, reviewed, and implemented.

## Tech Stack
- Node.js (runtime environment)
- Bun (package manager and runtime)
- OpenSpec (specification framework for change management)
- @opencode-ai/plugin (OpenCode AI integration)

## Project Conventions

### Code Style
- Use kebab-case for file names and identifiers
- Follow standard JavaScript/Node.js conventions
- No semicolons required (Bun style)
- Use async/await for asynchronous operations

### Architecture Patterns
- Specification-driven development using OpenSpec
- Command-based architecture for OpenCode integration
- Modular design with separate concerns for proposals, tasks, and specs

### Testing Strategy
- Unit tests for individual functions and modules
- Integration tests for API interactions
- Manual testing for Cloudflare API changes
- Validation through OpenSpec's built-in checks

### Git Workflow
- Main branch for production code
- Feature branches for changes (named after OpenSpec change IDs)
- Pull requests required for all changes
- Commit messages follow conventional format

## Domain Context
Cloudflare redirects allow routing traffic from one URL to another. This project focuses on managing redirect rules through Cloudflare's API, including:
- Creating new redirect rules
- Updating existing rules
- Deleting obsolete rules
- Bulk operations for multiple redirects
- Validation of redirect configurations

## Important Constraints
- Must comply with Cloudflare API rate limits
- Changes require proper authentication and permissions
- Redirect rules must be valid URLs and follow HTTP standards
- Changes should not break existing traffic patterns

## External Dependencies
- Cloudflare API (for managing redirects)
- OpenCode AI platform (for command execution and AI assistance)
