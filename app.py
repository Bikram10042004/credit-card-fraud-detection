from flask import Flask, render_template, request, jsonify, send_file
import joblib
import numpy as np
import pandas as pd
import io

app = Flask(__name__)

model = joblib.load("model.pkl")

# Store uploaded results
transaction_data = None


# ---------------- HOME ----------------
@app.route("/")
def home():
    return render_template("index.html")


# ---------------- DEMO ----------------
@app.route("/demo", methods=["POST"])
def demo():

    features = [
        0,
        -1.359807,
        -0.072781,
        2.536347,
        1.378155,
        -0.338321,
        0.462388,
        0.239599,
        0.098698,
        0.363787,
        0.090794,
        -0.551600,
        -0.617801,
        -0.991390,
        -0.311169,
        1.468177,
        -0.470400,
        0.207971,
        0.025791,
        0.403993,
        0.251412,
        -0.018307,
        0.277838,
        -0.110474,
        0.066928,
        0.128539,
        -0.189115,
        0.133558,
        -0.021053,
        149.62
    ]

    features = np.array(features).reshape(1, -1)

    prediction = model.predict(features)[0]
    probability = model.predict_proba(features)[0][1]

    if prediction == 1:
        result = "Fraudulent Transaction"
    else:
        result = "Normal Transaction"

    return jsonify({
        "result": result,
        "prediction": int(prediction),
        "probability": round(float(probability) * 100, 2)
    })


# ---------------- CSV UPLOAD ----------------
@app.route("/upload", methods=["POST"])
def upload():

    global transaction_data

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    try:

        df = pd.read_csv(file)

        required_columns = [
            "Time",
            "V1", "V2", "V3", "V4", "V5", "V6", "V7",
            "V8", "V9", "V10", "V11", "V12", "V13", "V14",
            "V15", "V16", "V17", "V18", "V19", "V20", "V21",
            "V22", "V23", "V24", "V25", "V26", "V27", "V28",
            "Amount"
        ]

        missing = [col for col in required_columns if col not in df.columns]

        if missing:
            return jsonify({
                "error": f"Missing columns: {missing}"
            }), 400

        # Remove rows with missing feature values
        df = df.dropna(subset=required_columns).copy()

        X = df[required_columns]

        # Prediction
        predictions = model.predict(X)
        probabilities = model.predict_proba(X)[:, 1]

        df["Prediction"] = predictions
        df["Fraud_Probability"] = probabilities * 100

        df["Status"] = np.where(
            df["Prediction"] == 1,
            "Fraud",
            "Normal"
        )

        # Transaction ID
        df.insert(0, "Transaction_ID", range(1, len(df) + 1))

        transaction_data = df

        total = len(df)
        fraud = int((df["Prediction"] == 1).sum())
        normal = total - fraud

        fraud_percentage = (fraud / total * 100) if total > 0 else 0

        total_amount = float(df["Amount"].sum())

        return jsonify({
            "success": True,
            "total": total,
            "fraud": fraud,
            "normal": normal,
            "fraud_percentage": round(fraud_percentage, 2),
            "total_amount": round(total_amount, 2)
        })

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# ---------------- TRANSACTIONS ----------------
@app.route("/transactions")
def transactions():

    global transaction_data

    if transaction_data is None:
        return jsonify({
            "error": "No CSV uploaded"
        }), 400

    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    status = request.args.get("status", "all")
    search = request.args.get("search", "").lower()

    df = transaction_data

    # Filter
    if status == "fraud":
        df = df[df["Prediction"] == 1]

    elif status == "normal":
        df = df[df["Prediction"] == 0]

    # Search
    if search:
        df = df[
            df["Transaction_ID"]
            .astype(str)
            .str.contains(search)
        ]

    total_filtered = len(df)

    start = (page - 1) * per_page
    end = start + per_page

    result = df.iloc[start:end]

    # Convert to JSON
    records = result.to_dict(orient="records")

    # Convert numpy values
    for record in records:
        for key, value in record.items():

            if isinstance(value, (np.integer,)):
                record[key] = int(value)

            elif isinstance(value, (np.floating,)):
                record[key] = float(value)

    return jsonify({
        "transactions": records,
        "total": total_filtered,
        "page": page,
        "per_page": per_page,
        "pages": int(np.ceil(total_filtered / per_page))
    })


# ---------------- DOWNLOAD RESULTS ----------------
@app.route("/download")
def download():

    global transaction_data

    if transaction_data is None:
        return "No data available"

    output = io.BytesIO()

    transaction_data.to_csv(
        output,
        index=False
    )

    output.seek(0)

    return send_file(
        output,
        mimetype="text/csv",
        as_attachment=True,
        download_name="fraud_detection_results.csv"
    )


# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(debug=True)