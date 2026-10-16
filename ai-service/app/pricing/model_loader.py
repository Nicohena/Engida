"""Model loading utilities"""
from pathlib import Path
from typing import Any, Optional
from app.core.logging import logger


class ModelLoader:
    """Loads trained ML models from disk"""
    
    @staticmethod
    def load_model(model_path: str) -> Optional[Any]:
        """
        Load model from file.
        
        Supports:
        - sklearn pickled models
        - PyTorch models
        - TensorFlow models
        - ONNX models
        """
        path = Path(model_path)
        
        if not path.exists():
            logger.error(f"Model not found: {model_path}")
            return None
        
        # TODO: Implement model loading based on file extension
        # .pkl -> pickle
        # .pt/.pth -> PyTorch
        # .h5 -> Keras/TensorFlow
        # .onnx -> ONNX
        
        logger.info(f"Loading model from: {model_path}")
        return None
    
    @staticmethod
    def load_pricing_model() -> Optional[Any]:
        """Load the latest pricing model"""
        model_dir = Path("models/pricing")
        
        if not model_dir.exists():
            logger.warning("Pricing model directory does not exist")
            return None
        
        # Find latest model file
        model_files = list(model_dir.glob("*.pkl"))
        if not model_files:
            logger.warning("No pricing models found")
            return None
        
        latest_model = max(model_files, key=lambda p: p.stat().st_mtime)
        return ModelLoader.load_model(str(latest_model))
