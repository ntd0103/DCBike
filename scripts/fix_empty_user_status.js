const { pool } = require('../config/database');

async function fixEmptyStatuses() {
  try {
    console.log('Searching for nguoi_dung rows with empty or NULL trang_thai...');
    const [found] = await pool.execute(
      "SELECT id, ten, email, loai_tai_khoan, trang_thai, created_at FROM nguoi_dung WHERE trang_thai = '' OR trang_thai IS NULL"
    );

    if (!found || found.length === 0) {
      console.log('No rows found. Nothing to update.');
      process.exit(0);
    }

    console.log(`Found ${found.length} row(s). Listing IDs: ${found.map(r => r.id).join(', ')}`);
    console.table(found.map(r => ({ id: r.id, ten: r.ten, email: r.email, loai_tai_khoan: r.loai_tai_khoan, trang_thai: r.trang_thai })));

    const [result] = await pool.execute(
      "UPDATE nguoi_dung SET trang_thai = 'tam_khoa', loai_tai_khoan = CASE WHEN loai_tai_khoan = 'tai_xe' THEN 'khach_hang' ELSE loai_tai_khoan END WHERE trang_thai = '' OR trang_thai IS NULL"
    );

    console.log(`Updated ${result.affectedRows} row(s).`);
    process.exit(0);
  } catch (err) {
    console.error('Error while fixing statuses:', err);
    process.exit(1);
  }
}

fixEmptyStatuses();
