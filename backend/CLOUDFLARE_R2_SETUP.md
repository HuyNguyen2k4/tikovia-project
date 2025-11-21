# Hướng dẫn cấu hình Cloudflare R2 cho Tikovia Project

## 🚀 Tổng quan

Dự án đã được cấu hình để sử dụng Cloudflare R2 thay vì Cloudinary để upload và lưu trữ hình ảnh sản phẩm.

## 📋 Yêu cầu

- Node.js 18+
- Cloudflare account
- R2 bucket đã tạo

## 🔧 Cấu hình Backend

### 1. Cài đặt Dependencies

```bash
cd tikovia_project_be
npm install
```

### 2. Cấu hình Environment Variables

Thêm vào file `.env`:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
```

### 3. Tạo thư mục uploads

```bash
mkdir -p uploads/temp
```

## 🎨 Cấu hình Frontend

### 1. Cài đặt Dependencies

```bash
cd tikovia_project_fe
npm install
```

### 2. Cấu hình Environment Variables

Thêm vào file `.env`:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

## 📡 API Endpoints

### Upload Ảnh Sản Phẩm

#### Upload 1 ảnh
```http
POST /api/upload/product-image
Content-Type: multipart/form-data

Body: image (file)
```

#### Upload nhiều ảnh
```http
POST /api/upload/product-images
Content-Type: multipart/form-data

Body: images[] (files)
```

#### Xóa ảnh
```http
DELETE /api/upload/product-image/:key
```

#### Test kết nối
```http
GET /api/upload/test
```

## 🧩 Sử dụng trong Frontend

### 1. Component Upload Đơn giản

```jsx
import ImageUpload from '@components/common/ImageUpload';

function ProductForm() {
  const [imageUrl, setImageUrl] = useState('');

  return (
    <ImageUpload
      value={imageUrl}
      onChange={setImageUrl}
      placeholder="Chọn ảnh sản phẩm"
    />
  );
}
```

### 2. Component Upload Nâng cao

```jsx
import ProductImageUpload from '@components/common/ProductImageUpload';

function ProductForm() {
  const [imageUrl, setImageUrl] = useState('');

  return (
    <ProductImageUpload
      value={imageUrl}
      onChange={setImageUrl}
      showPreview={true}
    />
  );
}
```

### 3. Sử dụng Hook

```jsx
import useImageUpload from '@hooks/useImageUpload';

function MyComponent() {
  const { uploadImage, uploading, error } = useImageUpload();

  const handleFileSelect = async (file) => {
    const result = await uploadImage(file);
    if (result.success) {
      console.log('Upload thành công:', result.data.url);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleFileSelect(e.target.files[0])} />
      {uploading && <p>Đang upload...</p>}
      {error && <p>Lỗi: {error}</p>}
    </div>
  );
}
```

## 🔧 Cấu hình Cloudflare R2

### 1. Tạo R2 Bucket

1. Đăng nhập [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vào **R2 Object Storage** > **Buckets**
3. Click **Create bucket**
4. Đặt tên bucket (ví dụ: `tikovia-images`)
5. Chọn region gần nhất

### 2. Tạo API Token

1. Vào **R2 Object Storage** > **Manage R2 API tokens**
2. Click **Create API token**
3. Đặt tên token (ví dụ: "Tikovia R2 Token")
4. Chọn quyền: **Object Read & Write**
5. Click **Create API token**
6. **Lưu lại** Access Key ID và Secret Access Key

### 3. Cấu hình Public Access (Optional)

1. Vào **R2 Object Storage** > **Buckets** > Chọn bucket
2. Vào **Settings** > **Public access**
3. Bật **Allow Access**
4. Cấu hình domain tùy chỉnh (optional)

## 🧪 Test Cấu hình

### 1. Test Backend

```bash
# Start server
cd tikovia_project_be
npm run dev

# Test endpoint
curl -X GET http://localhost:3000/api/upload/test
```

### 2. Test Frontend

```bash
# Start frontend
cd tikovia_project_fe
npm run dev

# Truy cập http://localhost:5173
```

## 📝 Sử dụng trong Product Controller

Controller đã được cập nhật để hỗ trợ trường `imgUrl`:

```javascript
// Tạo sản phẩm với ảnh
const product = await Product.createProduct({
  skuCode: 'SKU001',
  name: 'Sản phẩm A',
  categoryId: 'category-id',
  imgUrl: 'https://pub-xxx.r2.dev/products/image.jpg' // URL từ R2
});
```

## 🚨 Troubleshooting

### Lỗi kết nối R2
- Kiểm tra credentials trong `.env`
- Kiểm tra bucket name và endpoint
- Chạy test endpoint: `GET /api/upload/test`

### Lỗi upload
- Kiểm tra file size (max 10MB)
- Kiểm tra file type (chỉ ảnh)
- Kiểm tra quyền write của R2 token

### Lỗi CORS
- Kiểm tra cấu hình CORS trong server
- Kiểm tra `VITE_API_BASE_URL` trong frontend

## 📊 Performance Tips

- Sử dụng CDN cho public access
- Compress ảnh trước khi upload
- Sử dụng lazy loading cho frontend
- Cache URL trong database

## 🔄 Migration từ Cloudinary

1. Backup dữ liệu Cloudinary hiện tại
2. Cấu hình R2 theo hướng dẫn trên
3. Test upload/delete với R2
4. Cập nhật code sử dụng R2 thay vì Cloudinary
5. Migrate dữ liệu từ Cloudinary sang R2 (nếu cần)
6. Xóa cấu hình Cloudinary

## 📚 Tài liệu tham khảo

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS SDK v3 Documentation](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/)
- [Multer Documentation](https://github.com/expressjs/multer)

