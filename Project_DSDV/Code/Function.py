import numpy as np
import pandas as pd
from scipy.stats import chi2_contingency
def cramers_v(x: pd.Series, y: pd.Series) -> float:
    """Bias-corrected Cramér's V association measure (0 = none, 1 = perfect)."""
    ct = pd.crosstab(x, y)
    chi2, _, _, _ = chi2_contingency(ct)
    n = ct.values.sum()
    phi2 = chi2 / n
    r, k = ct.shape
    phi2corr = max(0, phi2 - ((k - 1) * (r - 1)) / (n - 1))
    rcorr = r - ((r - 1) ** 2) / (n - 1)
    kcorr = k - ((k - 1) ** 2) / (n - 1)
    denom = min(kcorr - 1, rcorr - 1)
    return 0.0 if denom <= 0 else np.sqrt(phi2corr / denom)