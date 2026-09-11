const TERMS = [
  "The Price quoted is for food alone Ex Kitchen at West Mambalam and includes applicable GST ( At present 5%).",
  "We help arrange service persons and connect them to you. Their cost will be paid directly at your end.",
  "We help arrange transport through online apps like Lynk/Porter and the charges will be paid by you directly.( For both from and to our kitchen)",
  "Items like bottled Water, Ice Cream, Beeda etc are out sourced and we are not responsible for the quality of the same.",
  "Price is not negotiable. 50% of the value of the order, as non-refundable advance at the time of placing the order. Balance amount shall be paid in full at least 7 days prior to the order date, failing which, the order shall be cancelled.",
  "Changes can be made to the order 3 days prior to the order date.",
  "Service Vessels will be provided, if needed, on a chargeable basis.",
];

export default function TermsAndConditions() {
  return (
    <div className="bill-page bill-terms">
      <div className="bill-terms-inner">
        <h2 className="bill-terms-title">Terms and Conditions</h2>
        <ol className="bill-terms-list">
          {TERMS.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
        <p className="bill-terms-footer-note">"For Outdoor Orders"</p>
      </div>
    </div>
  );
}
