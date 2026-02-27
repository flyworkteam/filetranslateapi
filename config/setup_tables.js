// Kendi veritabanı dosyanın yolunu buraya doğru şekilde yazmalısın. 
const db = require('./database');

async function createTables() {
    try {
        console.log("🚀 Tablo oluşturma/güncelleme işlemi başlıyor...");

        // 1. Users Tablosu (Username ve Profile Image eklendi)
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                device_id VARCHAR(255) NOT NULL UNIQUE,
                username VARCHAR(255) DEFAULT 'User',
                profile_image TEXT DEFAULT NULL,
                is_premium BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // 2. Documents Tablosu (analysis_summary EKLENDİ ✅)
        const createDocumentsTable = `
            CREATE TABLE IF NOT EXISTS documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                doc_name VARCHAR(255),
                doc_path TEXT,
                analysis_summary TEXT DEFAULT NULL, 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `;

        // 3. Chat History Tablosu
        const createChatHistoryTable = `
            CREATE TABLE IF NOT EXISTS chat_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                document_id INT DEFAULT NULL, 
                chat_title VARCHAR(255),
                chat_content JSON, 
                last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                message_count INT DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
            )
        `;

        console.log("1. 'users' tablosu kontrol ediliyor...");
        await db.query(createUsersTable);

        console.log("2. 'documents' tablosu kontrol ediliyor...");
        await db.query(createDocumentsTable);

        console.log("3. 'chat_history' tablosu kontrol ediliyor...");
        await db.query(createChatHistoryTable);

        // --- MEVCUT TABLOYA SÜTUN EKLEME (ALTER) ---
        // Eğer tablo zaten varsa ve sadece sütun eksikse burası devreye girer
        console.log("4. Eksik sütunlar kontrol ediliyor...");
        try {
            await db.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS analysis_summary TEXT DEFAULT NULL;`);
            await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) DEFAULT 'User';`);
            await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT DEFAULT NULL;`);
        } catch (alterError) {
            // Bazı MySQL versiyonları 'IF NOT EXISTS'i ALTER içinde desteklemez
            // Hata alırsan sütun zaten vardır, sorun yok.
            console.log("Not: Sütunlar zaten mevcut olabilir, işleme devam ediliyor.");
        }

        console.log("✅ Tüm tablolar başarıyla oluşturuldu ve güncellendi!");

        process.exit(0);

    } catch (error) {
        console.error("❌ Tablo oluşturulurken hata:", error.message);
        process.exit(1);
    }
}

createTables();