import os

# Disable the heavy Torch pipeline when running tests, avoiding OpenMP or Metal init issues.
os.environ["PIPELINE_DISABLE_TORCH"] = "1"
