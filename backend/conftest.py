import sys
import os

# Make sure `app` package is resolvable when pytest is run from the backend/ directory
sys.path.insert(0, os.path.dirname(__file__))
