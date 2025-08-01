import * as fs from 'fs';
import * as path from 'path';

export const unlinkFile = (filename: string, folder = 'uploads'): void => {
  const filePath = path.join(process.cwd(), folder, filename); 
  
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return;
    }
    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) {
        return;
      } else {
        console.log(`File deleted: ${filePath}`);
      }
    });
  });
};