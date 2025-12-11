import https from 'https';

const TOKEN = 'oo1EcKsmpnbAN9bD0jBvsDQr';
const PROJECT_ID = 'prj_2qbO3hge84LQb55u6JxUC94BGScc';
const DOMAIN = 'hub.saboarena.com';

console.log('🔐 Getting verification details for hub.saboarena.com...\n');

const options = {
  hostname: 'api.vercel.com',
  path: `/v10/projects/${PROJECT_ID}/domains/${DOMAIN}/config`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    
    if (res.statusCode === 200) {
      const config = JSON.parse(data);
      
      console.log('\n📋 DOMAIN CONFIGURATION:\n');
      console.log('Domain:', config.name || DOMAIN);
      console.log('Apex:', config.apexName);
      console.log('Verified:', config.verified ? '✅ Yes' : '❌ No');
      
      if (config.misconfigured) {
        console.log('\n⚠️  DOMAIN IS MISCONFIGURED\n');
      }
      
      if (config.verification) {
        console.log('\n🔑 VERIFICATION REQUIRED:\n');
        config.verification.forEach((record, i) => {
          console.log(`Record ${i + 1}:`);
          console.log(`  Type: ${record.type}`);
          console.log(`  Domain: ${record.domain}`);
          console.log(`  Value: ${record.value}`);
          console.log(`  Reason: ${record.reason || 'Domain verification'}`);
          console.log('');
        });
        
        console.log('📝 ADD THIS TO CLOUDFLARE:\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        config.verification.forEach((record) => {
          console.log(`Type: ${record.type}`);
          console.log(`Name: ${record.domain === DOMAIN ? '@' : record.domain.replace(`.${config.apexName}`, '')}`);
          console.log(`Value: ${record.value}`);
          console.log(`TTL: Auto`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        });
      }
      
      if (config.configuredBy) {
        console.log('\n⚙️  Configured by:', config.configuredBy);
      }
      
      if (config.serviceType) {
        console.log('Service type:', config.serviceType);
      }
      
    } else {
      console.log('\n❌ Error getting domain config');
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
});

req.end();
