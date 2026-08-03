"""
2.py — Entry point wrapper for Engine 2 (Negative Access Profiler).
Triggers training, evaluation (with plot generation), and runs the demo for Rajesh Kumar (EMP001).
"""
import sys
import pathlib

# Resolve paths
_CURRENT_DIR = pathlib.Path(__file__).parent.resolve()
_ENGINE_DIR  = _CURRENT_DIR / "engine2_negative_access"

if str(_ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(_ENGINE_DIR))

try:
    from model.train import train
    from model.evaluate import evaluate_model
    from visualization.timeline import main as generate_timelines
    from demo import run_demo
except ImportError as e:
    print(f"Error importing modules: {e}")
    print(f"sys.path was: {sys.path}")
    sys.exit(1)


def main():
    print("=" * 70)
    print("PHANTOM — Engine 2: Negative Access Profiler (Full Pipeline)")
    print("=" * 70)

    # 1. Train the model
    print("\n[Step 1/4] Training Isolation Forest...")
    train(verbose=True)

    # 2. Evaluate the model
    print("\n[Step 2/4] Evaluating Model & Generating Visualizations...")
    evaluate_model()

    # 3. Generate employee behavioral timelines (Step 15)
    print("\n[Step 3/4] Generating Timeline Visualization Artifacts...")
    generate_timelines()

    # 4. Run the Demo profile for EMP001
    print("\n[Step 4/4] Running Demo Profile for EMP001...")
    run_demo("EMP001")

    print("\nPipeline execution completed successfully!")


if __name__ == "__main__":
    main()
