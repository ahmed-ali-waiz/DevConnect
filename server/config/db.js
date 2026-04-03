import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (String(error.message).includes("querySrv ECONNREFUSED")) {
      console.error("💡 Atlas SRV DNS lookup failed. Check internet/DNS access from this machine or use Atlas non-SRV URI (mongodb://...) in MONGO_URI.");
    }
    process.exit(1);
  }
};

export default connectDB;
