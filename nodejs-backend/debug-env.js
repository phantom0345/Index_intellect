import dotenv from 'dotenv';
const result = dotenv.config();
if (result.error) {
    console.log('Error loading .env:', result.error);
} else {
    console.log('.env loaded successfully');
    console.log('GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
    if (process.env.GEMINI_API_KEY) {
        console.log('GEMINI_API_KEY length:', process.env.GEMINI_API_KEY.length);
    }
}
