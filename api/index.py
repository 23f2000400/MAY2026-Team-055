import os
import sys

# Force OpenSSL to use TLS 1.2 max — OpenSSL 3.5.x on Vercel's Python 3.12
# sends TLS 1.3 extensions that MongoDB Atlas rejects with internal_error.
# Must be set before any ssl import so OpenSSL reads the config on first init.
os.environ.setdefault('OPENSSL_CONF', '/var/task/openssl.cnf')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from server import app
