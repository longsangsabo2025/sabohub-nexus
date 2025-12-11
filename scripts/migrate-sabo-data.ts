#!/usr/bin/env node
/**
 * SABO Billiards Data Migration Script
 * Standardizes all SABO Billiards data usage across the codebase
 */

import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { glob } from 'glob';

const SABO_COMPANY_ID = 'feef10d3-899d-4554-8107-b2256918213a';

// Common patterns to replace
const PATTERNS = {
  // Replace hardcoded company IDs
  hardcodedCompanyId: [
    /['"`]feef10d3-899d-4554-8107-b2256918213a['"`]/g,
    "SABO_BILLIARDS.COMPANY_ID"
  ],
  
  // Replace hardcoded company name variations
  hardcodedNames: [
    /['"`]SABO\s*Billiards['"`]/g,
    "SABO_BILLIARDS.NAME"
  ],
  
  // Replace hardcoded addresses
  hardcodedAddress: [
    /['"`]601A\s*Nguyễn\s*An\s*Ninh[^'"`]*['"`]/g,
    "SABO_BILLIARDS.ADDRESS"
  ],
  
  // Replace coordinates
  hardcodedLat: [
    /10\.3631589/g,
    "SABO_BILLIARDS.COORDINATES.LATITUDE"
  ],
  hardcodedLng: [
    /107\.0940979/g,
    "SABO_BILLIARDS.COORDINATES.LONGITUDE"
  ],
  
  // Replace supabase direct calls with centralized API
  supabaseCompanies: [
    /supabase\.table\(['"`]companies['"`]\)/g,
    "saboApi.company"
  ],
  supabaseEmployees: [
    /supabase\.table\(['"`]employees['"`]\)/g,
    "saboApi.employee"
  ],
  supabaseTasks: [
    /supabase\.table\(['"`]tasks['"`]\)/g,
    "saboApi.task"
  ]
};

async function findFiles(pattern: string): Promise<string[]> {
  try {
    return await glob(pattern, { 
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'] 
    });
  } catch (error) {
    console.error(`Error finding files: ${error}`);
    return [];
  }
}

async function processFile(filePath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    let updatedContent = content;
    let hasChanges = false;

    // Apply all patterns
    for (const [key, [pattern, replacement]] of Object.entries(PATTERNS)) {
      const newContent = updatedContent.replace(pattern, replacement);
      if (newContent !== updatedContent) {
        updatedContent = newContent;
        hasChanges = true;
        console.log(`  ✓ Applied ${key} pattern to ${filePath}`);
      }
    }

    // Add import if we made changes and file doesn't already import SABO constants
    if (hasChanges && !content.includes('SABO_BILLIARDS')) {
      const ext = extname(filePath);
      let importStatement = '';
      
      if (['.ts', '.tsx'].includes(ext)) {
        importStatement = "import { SABO_BILLIARDS, saboApi } from '@/lib/sabo-billiards';\n";
      } else if (['.js', '.jsx'].includes(ext)) {
        importStatement = "import { SABO_BILLIARDS, saboApi } from '@/lib/sabo-billiards';\n";
      }

      if (importStatement) {
        // Find the last import statement or add at the top
        const importRegex = /^import.*from.*['"`][^'"`]+['"`];?\s*$/gm;
        const imports = content.match(importRegex);
        
        if (imports && imports.length > 0) {
          const lastImport = imports[imports.length - 1];
          const lastImportIndex = content.lastIndexOf(lastImport);
          const insertIndex = lastImportIndex + lastImport.length;
          updatedContent = content.slice(0, insertIndex) + '\n' + importStatement + content.slice(insertIndex);
        } else {
          updatedContent = importStatement + '\n' + updatedContent;
        }
      }
    }

    if (hasChanges) {
      await fs.writeFile(filePath, updatedContent, 'utf-8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error processing file ${filePath}: ${error}`);
    return false;
  }
}

async function main() {
  console.log('🎱 SABO Billiards Data Migration');
  console.log('================================');
  console.log('Standardizing SABO Billiards data usage across the codebase...\n');

  const filePatterns = [
    'src/**/*.{ts,tsx,js,jsx}',
    'pages/**/*.{ts,tsx,js,jsx}',
    'app/**/*.{ts,tsx,js,jsx}',
    'components/**/*.{ts,tsx,js,jsx}',
    'lib/**/*.{ts,tsx,js,jsx}',
    'utils/**/*.{ts,tsx,js,jsx}'
  ];

  let totalFiles = 0;
  let updatedFiles = 0;

  for (const pattern of filePatterns) {
    console.log(`🔍 Searching for files: ${pattern}`);
    const files = await findFiles(pattern);
    
    for (const file of files) {
      // Skip the SABO Billiards lib files themselves
      if (file.includes('sabo-billiards')) {
        continue;
      }

      totalFiles++;
      const updated = await processFile(file);
      if (updated) {
        updatedFiles++;
        console.log(`  📝 Updated: ${file}`);
      }
    }
  }

  console.log('\n📊 Migration Summary');
  console.log('===================');
  console.log(`Total files processed: ${totalFiles}`);
  console.log(`Files updated: ${updatedFiles}`);
  console.log(`Files unchanged: ${totalFiles - updatedFiles}`);

  if (updatedFiles > 0) {
    console.log('\n✅ Migration completed successfully!');
    console.log('🔧 Next steps:');
    console.log('1. Review the changes in your version control');
    console.log('2. Test the application to ensure everything works');
    console.log('3. Update any remaining manual references');
    console.log('4. Consider running TypeScript compiler to check for errors');
  } else {
    console.log('\n✅ No files needed updating - codebase already standardized!');
  }
}

// Run the migration
if (require.main === module) {
  main().catch(console.error);
}