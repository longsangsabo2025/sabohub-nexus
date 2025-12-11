import fetch from 'node-fetch';

const RENDER_API_KEY = process.env.RENDER_API_KEY;

if (!RENDER_API_KEY) {
  console.error('❌ Lỗi: Không tìm thấy RENDER_API_KEY. Vui lòng cung cấp key!');
  console.log('👉 Cách dùng: $env:RENDER_API_KEY="rnd_xxxxx"; node scripts/deploy_render_api.js');
  process.exit(1);
}

const REPO_URL = 'https://github.com/longsangsabo2025/sabohub-nexus';
const SERVICE_NAME = 'sabo-neural-link';

async function deployToRender() {
  console.log('🚀 Đang kết nối đến Render API...');

  try {
    // 1. Tìm xem service đã tồn tại chưa
    const listRes = await fetch('https://api.render.com/v1/services?limit=20', {
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!listRes.ok) {
      throw new Error(`Lỗi kết nối Render: ${listRes.statusText}`);
    }

    const listData = await listRes.json();
    const existingService = listData.find(s => s.service.name === SERVICE_NAME);

    if (existingService) {
      console.log(`✅ Tìm thấy service: ${existingService.service.name} (${existingService.service.id})`);
      console.log('🔄 Đang trigger deploy mới nhất...');
      
      const deployRes = await fetch(`https://api.render.com/v1/services/${existingService.service.id}/deploys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RENDER_API_KEY}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clearCache: false })
      });

      if (deployRes.ok) {
        const deployData = await deployRes.json();
        console.log(`🎉 Deploy thành công! ID: ${deployData.id}`);
      } else {
        console.error('❌ Deploy thất bại:', await deployRes.text());
      }

    } else {
      console.log('🆕 Service chưa tồn tại. Đang lấy thông tin Owner...');
      
      // 1.1 Get Owner ID
      const ownerRes = await fetch('https://api.render.com/v1/owners', {
        headers: {
          'Authorization': `Bearer ${RENDER_API_KEY}`,
          'Accept': 'application/json'
        }
      });

      if (!ownerRes.ok) {
        throw new Error(`Không thể lấy thông tin Owner: ${await ownerRes.text()}`);
      }

      const owners = await ownerRes.json();
      if (owners.length === 0) {
        throw new Error('Không tìm thấy Owner nào trong tài khoản Render của bạn.');
      }
      
      const ownerId = owners[0].owner.id;
      console.log(`👤 Sử dụng Owner ID: ${ownerId} (${owners[0].owner.name})`);

      console.log('🚀 Đang tạo Blueprint mới (Infrastructure as Code)...');
      
      const createRes = await fetch('https://api.render.com/v1/blueprints', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RENDER_API_KEY}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Sabo Neural Link System',
          ownerId: ownerId,
          repo: REPO_URL,
          branch: 'main',
          autoDeploy: true
        })
      });

      if (createRes.ok) {
        const createData = await createRes.json();
        console.log(`🎉 Đã tạo Blueprint thành công! ID: ${createData.id}`);
        console.log(`👉 Truy cập Dashboard để xem tiến độ: https://dashboard.render.com/blueprints/${createData.id}`);
      } else {
        console.error('❌ Tạo Blueprint thất bại:', await createRes.text());
      }
    }

  } catch (error) {
    console.error('❌ Lỗi:', error);
  }
}

deployToRender();
