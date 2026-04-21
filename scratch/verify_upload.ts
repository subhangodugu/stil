import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

async function verifyUpload() {
  const url = 'http://localhost:3000/api/uploads/analyze';
  const stilPath = path.join(process.cwd(), 'scratch', 'sample.stil');
  
  if (!fs.existsSync(stilPath)) {
    console.error('❌ Sample STIL file not found at:', stilPath);
    return;
  }

  console.log('🚀 Testing API Connection: POST /api/uploads/analyze');
  
  const form = new FormData();
  form.append('stil', fs.createReadStream(stilPath));

  try {
    const response = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    console.log('✅ API Response Received!');
    console.log('Status:', response.status);
    
    const data = response.data;
    
    if (data.projectData && data.chipResult && data.failingFFs) {
      console.log('✅ Response Structure Correct:');
      console.log('   - Project Data (Architecture) Found:', !!data.projectData);
      console.log('   - Scan Chains Count:', data.projectData.scanChains?.length);
      console.log('   - Chip Result ID:', data.chipResult.id);
      console.log('   - Failing FFs Map size:', Object.keys(data.failingFFs).length);
    } else {
      console.error('❌ Response structure is missing required fields!');
      console.log('Received keys:', Object.keys(data));
    }
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Connection Refused: Is the backend server running on port 3000?');
    } else {
      console.error('❌ API Test Failed:', error.message);
      if (error.response) {
        console.error('   Response Data:', error.response.data);
      }
    }
  }
}

verifyUpload();
