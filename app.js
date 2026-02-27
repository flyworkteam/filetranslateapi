const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes');
const documentRoutes = require('./routes/documentRoutes');

app.use(express.json()); // Body-parser

// Route'ları bağla
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);

const PORT = 3031;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});