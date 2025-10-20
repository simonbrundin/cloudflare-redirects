const { validateRedirectsConfig } = require('./validate-redirects');
const fs = require('fs');

// Mock fs
jest.mock('fs');

describe('validateRedirectsConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate a correct config', () => {
    const mockConfig = {
      version: '1.0',
      redirects: {
        'blog.example.com': 'https://blog.target.com',
        'api.example.com': 'https://api.target.com'
      }
    };
    fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

    console.log = jest.fn();
    process.exit = jest.fn();

    validateRedirectsConfig();

    expect(console.log).toHaveBeenCalledWith('Configuration file is valid');
    expect(process.exit).not.toHaveBeenCalled();
  });

  it('should fail on invalid version', () => {
    const mockConfig = {
      version: '2.0',
      redirects: {}
    };
    fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

    console.error = jest.fn();
    process.exit = jest.fn();

    validateRedirectsConfig();

    expect(console.error).toHaveBeenCalledWith('Validation failed:', 'Invalid or missing version. Expected "1.0"');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should fail on invalid source domain', () => {
    const mockConfig = {
      version: '1.0',
      redirects: {
        'blog': 'https://blog.target.com'
      }
    };
    fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

    console.error = jest.fn();
    process.exit = jest.fn();

    validateRedirectsConfig();

    expect(console.error).toHaveBeenCalledWith('Validation failed:', 'Invalid source domain: blog');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should fail on invalid target URL', () => {
    const mockConfig = {
      version: '1.0',
      redirects: {
        'blog.example.com': 'invalid-url'
      }
    };
    fs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

    console.error = jest.fn();
    process.exit = jest.fn();

    validateRedirectsConfig();

    expect(console.error).toHaveBeenCalledWith('Validation failed:', 'Invalid target URL for blog.example.com: invalid-url');
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});