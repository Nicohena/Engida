"""Model evaluation utilities"""
import numpy as np
from typing import List, Dict


class PricingModelEvaluator:
    """Evaluates pricing model performance"""
    
    @staticmethod
    def calculate_mape(
        predictions: List[float],
        actuals: List[float]
    ) -> float:
        """
        Calculate Mean Absolute Percentage Error.
        """
        predictions = np.array(predictions)
        actuals = np.array(actuals)
        
        # Avoid division by zero
        mask = actuals != 0
        if not np.any(mask):
            return 0.0
        
        mape = np.mean(np.abs((actuals[mask] - predictions[mask]) / actuals[mask])) * 100
        return float(mape)
    
    @staticmethod
    def calculate_rmse(
        predictions: List[float],
        actuals: List[float]
    ) -> float:
        """Calculate Root Mean Squared Error"""
        predictions = np.array(predictions)
        actuals = np.array(actuals)
        
        rmse = np.sqrt(np.mean((predictions - actuals) ** 2))
        return float(rmse)
    
    @staticmethod
    def calculate_r2_score(
        predictions: List[float],
        actuals: List[float]
    ) -> float:
        """Calculate R² score"""
        predictions = np.array(predictions)
        actuals = np.array(actuals)
        
        ss_res = np.sum((actuals - predictions) ** 2)
        ss_tot = np.sum((actuals - np.mean(actuals)) ** 2)
        
        if ss_tot == 0:
            return 0.0
        
        r2 = 1 - (ss_res / ss_tot)
        return float(r2)
    
    def evaluate_model(
        self,
        predictions: List[float],
        actuals: List[float]
    ) -> Dict[str, float]:
        """
        Comprehensive model evaluation.
        """
        return {
            "mape": self.calculate_mape(predictions, actuals),
            "rmse": self.calculate_rmse(predictions, actuals),
            "r2_score": self.calculate_r2_score(predictions, actuals),
        }
