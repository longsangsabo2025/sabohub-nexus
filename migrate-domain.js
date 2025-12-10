import https from 'https';

const TOKEN = 'oo1EcKsmpnbAN9bD0jBvsDQr';
const OLD_PROJECT_ID = 'prj_2qbO3hge84LQb55u6JxUC94BGScc'; // manager-portal
const NEW_PROJECT_ID = 'prj_3Jei9UiqQhPS7UVmQbyNWib7oYMx'; // sabohub-nexus
const DOMAIN = 'hub.saboarena.com';

console.log('🔄 Moving domain from old project to new project...\n');

// Step 1: Remove domain from old project
console.log('Step 1: Removing domain from OLD project (manager-portal)...');

const deleteOptions = {
  hostname: 'api.vercel.com',
  path: `/v9/projects/${OLD_PROJECT_ID}/domains/${DOMAIN}`,
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
};

const deleteReq = https.request(deleteOptions, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Delete Status Code:', res.statusCode);
    
    if (res.statusCode === 200 || res.statusCode === 204) {
      console.log('✅ Domain removed from old project!\n');
      
      // Step 2: Add domain to new project
      setTimeout(() => addDomainToNewProject(), 2000);
    } else {
      console.log('⚠️  Response:', data);
      console.log('\nProceeding to add domain anyway...\n');
      setTimeout(() => addDomainToNewProject(), 2000);
    }
  });
});

deleteReq.on('error', (error) => {
  console.error('❌ Delete failed:', error.message);
  console.log('Proceeding to add domain...\n');
  setTimeout(() => addDomainToNewProject(), 2000);
});

deleteReq.end();

function addDomainToNewProject() {
  console.log('Step 2: Adding domain to NEW project (sabohub-nexus)...');
  
  const addOptions = {
    hostname: 'api.vercel.com',
    path: `/v10/projects/${NEW_PROJECT_ID}/domains`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  };

  const postData = JSON.stringify({
    name: DOMAIN
  });

  const addReq = https.request(addOptions, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Add Status Code:', res.statusCode);
      
      if (res.statusCode === 200) {
        console.log('\n✅ Domain added to new project!');
        console.log('🔒 SSL certificate will be generated automatically');
        console.log('\n🎉 Migration complete!');
        console.log(`🌐 Your site will be live at: https://${DOMAIN}\n`);
      } else {
        console.log('\n❌ Failed to add domain');
        console.log('Response:', data);
      }
    });
  });

  addReq.on('error', (error) => {
    console.error('❌ Add failed:', error.message);
  });

  addReq.write(postData);
  addReq.end();
}
