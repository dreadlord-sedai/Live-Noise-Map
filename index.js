import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import noiseRoute from "./routes/noise.js";


dotenv.config();


const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors());
app.use(express.json({ limit: '1mb' }));


app.use('/add-noise', noiseRoute);


app.get('/', (req, res) => {
res.send('Live Noise Map Backend Running ');
});


app.listen(PORT, () => {
console.log(`Server running on http://localhost:${PORT}`);
});