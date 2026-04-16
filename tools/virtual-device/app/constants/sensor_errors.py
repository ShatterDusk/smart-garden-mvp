# Constants for sensor errors
NO_ERROR = "no_error"
ANOMALY = "anomaly"
MCAR = "mcar"
DUPLICATE_DATA = "duplicate_data"
DRIFT = "drift"
PROBABILITY_POS_ANOMALY = "probability_pos_anomaly"
PROBABILITY_NEG_ANOMALY = "probability_neg_anomaly"
POS_ANOMALY_UPPER_RANGE = "pos_anomaly_upper_range"
POS_ANOMALY_LOWER_RANGE = "pos_anomaly_lower_range"
NEG_ANOMALY_UPPER_RANGE = "neg_anomaly_upper_range"
NEG_ANOMALY_LOWER_RANGE = "neg_anomaly_lower_range"
PROBABILITY = "probability"
AFTER_N_ITERATIONS = "after_n_iterations"
AVERAGE_DRIFT_RATE = "average_drift_rate"
VARIATION_RANGE = "variation_range"

# UI map for sensor errors (used for displaying error settings in the UI in German)
SENSOR_ERRORS_UI_MAP = {
    "type": "Typ",
    ANOMALY: "Anomalie",
    MCAR: "Zufällig fehlend (MCAR)",
    DUPLICATE_DATA: "Duplikate",
    DRIFT: "Drift",
    PROBABILITY_POS_ANOMALY: "Wkt. für pos. Anomalie",
    PROBABILITY_NEG_ANOMALY: "Wkt. für neg. Anomalie",
    POS_ANOMALY_UPPER_RANGE: "Oberer Grenzwert für pos. Anomalie",
    POS_ANOMALY_LOWER_RANGE: "Unterer Grenzwert für pos. Anomalie",
    NEG_ANOMALY_UPPER_RANGE: "Oberer Grenzwert für neg. Anomalie",
    NEG_ANOMALY_LOWER_RANGE: "Unterer Grenzwert für neg. Anomalie",
    PROBABILITY: "Wahrscheinlichkeit",
    AFTER_N_ITERATIONS: "Ab n Iterationen",
    AVERAGE_DRIFT_RATE: "Mittlere Driftrate",
    VARIATION_RANGE: "Variationsbereich"
}