const fs = require('fs');
const path = require('path');

const backendSrc = path.join(__dirname, 'backend/src');
const frontendSrc = path.join(__dirname, 'frontend/src');

function getFiles(dir, filesList = []) {
  if (!fs.existsSync(dir)) return filesList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, filesList);
    } else {
      if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.css')) {
        filesList.push(fullPath);
      }
    }
  }
  return filesList;
}

const allBackendFiles = getFiles(backendSrc);
const allFrontendFiles = getFiles(frontendSrc);

let output = `# Project Submission

## 1. Folder Structure
\`\`\`
backend/
  ├── src/
  │   ├── config/       (Database & environment configs)
  │   ├── controllers/  (Core request handling and logic)
  │   ├── middleware/   (Auth and upload guards)
  │   ├── models/       (Mongoose database schemas)
  │   ├── routes/       (API route definitions)
  │   ├── utils/        (Helper functions like JWT generation)
  │   ├── index.ts      (Entry point)
  │   └── server.ts     (Express app configuration)
frontend/
  ├── src/
  │   ├── assets/       (Static images/icons)
  │   ├── components/   (Reusable UI parts like Navbar)
  │   ├── pages/        (Main screens: Home, Login, Editor)
  │   ├── services/     (Axios API setup)
  │   ├── store/        (Zustand state management)
  │   ├── App.tsx       (Main React wrapper)
  │   ├── main.tsx      (React DOM render)
  │   └── index.css     (Tailwind entry & basic styles)
\`\`\`

## 2. Dependencies
**Backend**:
- express, mongoose, bcryptjs, jsonwebtoken (Standard MERN stack)
- cors, dotenv, multer (Basic utilities)
- typescript, ts-node (Dev)

**Frontend**:
- react, react-dom, react-router-dom (Core UI)
- axios (API requests)
- zustand (State management)
- tailwindcss, postcss, autoprefixer (Styling)

## 3. Full Code File-by-File

`;

function appendFiles(label, files) {
  output += `### ${label}\n\n`;
  for (const file of files) {
    const relativePath = path.relative(__dirname, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf-8');
    output += `**${relativePath}**\n\`\`\`${relativePath.endsWith('.css') ? 'css' : 'typescript'}\n${content}\n\`\`\`\n\n`;
  }
}

appendFiles('Backend', allBackendFiles);
appendFiles('Frontend', allFrontendFiles);

output += `## 4. Setup Instructions
1. Clone the repository.
2. In the \`backend\` folder, run \`npm install\`.
3. In the \`frontend\` folder, run \`npm install\`.
4. Create a \`.env\` file in the \`backend\` folder with \`MONGO_URI=your_db_url\` and \`JWT_SECRET=your_secret\`.
5. Run \`npm run dev\` in the \`backend\` folder to start the server.
6. Run \`npm run dev\` in the \`frontend\` folder to start the React app.

## 5. Common Bugs/Limitations
- **Canvas CORS**: If you load external images onto the canvas without proper CORS headers from the image host, the canvas becomes "tainted" and you won't be able to export or share the image.
- **Mobile View**: The Editor layout works best on desktop or tablet. On small mobile screens, the sliders might overlap if not carefully scrolled.
- **Image Size**: There is no hard limit on uploaded profile pictures yet, which could cause slight lag on the canvas if a user uploads a 10MB image.

## 6. Explanations
- **State Management**: Used Zustand. It's incredibly simple, requires no wrappers, and does exactly what we need (storing the user session) without the boilerplate of Redux.
- **UI Design**: Flat and practical. I intentionally avoided glowing gradients and complex glassmorphism because a standard utility-focused design is easier to maintain, faster to load, and more reliable across different devices.
`;

fs.writeFileSync(path.join(__dirname, 'project_explanation.md'), output);
console.log('Done!');
