const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/version', (req, res) => {
    res.json({
        version: "1.0.0",
        description: "API to check the version of the service."
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
