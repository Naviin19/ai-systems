"""Regenerate every plate.

One entry point, because three commands in a README is three chances to run two
of them and commit a set that is half a revision old."""
import os
import runpy

HERE = os.path.dirname(os.path.abspath(__file__))
for module in ("diagrams_01_03", "diagrams_04_06", "diagrams_07_10"):
    runpy.run_path(os.path.join(HERE, module + ".py"), run_name="__main__")
