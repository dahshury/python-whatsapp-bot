#!/usr/bin/env python3
import sys
import unittest
import os
from pathlib import Path

# Add the project root to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

def run_tests():
    """Run all test cases from the tests directory"""
    # Discover and load all tests in the 'unit' directory
    loader = unittest.TestLoader()
    start_dir = os.path.join(os.path.dirname(__file__), 'unit')
    suite = loader.discover(start_dir, pattern='test_*.py')
    
    # Run the test suite
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Return exit code based on test success/failure
    return 0 if result.wasSuccessful() else 1

if __name__ == '__main__':
    sys.exit(run_tests()) 