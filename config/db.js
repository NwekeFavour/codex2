const mongoose = require("mongoose")

const connectDB = async () => {
    try {   
        mongoose.set('strictQuery', false);
        const connect = await mongoose.connect(process.env.MONGO_URI);
        console.log(`Database is connected successfully: ${connect.connection.host}`);

        // await createAdmin();
    } catch (e) {
        console.error(e);   
    }
}

module.exports = connectDB
