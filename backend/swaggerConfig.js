const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Savvy Bucket API',
            version: '1.0.0',
            description: 'API Documentation for Savvy Bucket B2B Marketplace',
            contact: {
                name: 'Savvy Bucket Support',
                email: 'support@savvybucket.com',
            },
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Local server',
            },
            {
                url: 'https://savvy-backend-hazel.vercel.app',
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [{
            bearerAuth: [],
        }],
    },
    apis: ['./routes/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = specs;
