// Must load env vars FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

// Now safe to import everything else
import './server';
