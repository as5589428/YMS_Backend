const Razorpay = require('razorpay');

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

/**
 * Function to calculate charges based on uniqueId and Client_Segment.
 * @param {string} uniqueId 
 * @param {string} Client_Segment 
 * @returns {Promise<{total_charge: number, gst: number, total_charge_with_gst: number}>}
 */
const calculateCharges = async (uniqueId, Client_Segment) => {
    try {
        // Sample logic for charge calculation (replace with actual logic)
        let baseCharge = 1000; // Default base charge
        if (Client_Segment === 'premium') baseCharge = 2000;
        else if (Client_Segment === 'standard') baseCharge = 1500;

        // Calculate GST (e.g., 18% GST)
        const gst = baseCharge * 0.18;
        const totalChargeWithGST = baseCharge + gst;

        return {
            total_charge: baseCharge,
            gst: gst,
            total_charge_with_gst: totalChargeWithGST
        };
    } catch (error) {
        console.error("Error calculating charges:", error);
        throw new Error("Failed to calculate charges");
    }
};

module.exports = {
    razorpay,
    calculateCharges
};
