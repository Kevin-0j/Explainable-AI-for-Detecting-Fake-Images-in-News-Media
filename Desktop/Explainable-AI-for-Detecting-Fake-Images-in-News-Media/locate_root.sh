#!/usr/bin/env bash

echo "Starting directory:"
pwd
echo "----------------------"

# Step upward until we escape venv, venv310, .venv, or site-packages
while [[ "$PWD" =~ (venv|venv310|\.venv|site-packages) ]]; do
  echo "Inside venv folder, moving up..."
  cd ..
done

echo "----------------------"
echo "Now in real project root:"
pwd
echo "----------------------"

echo "Top-level entries:"
ls -1

