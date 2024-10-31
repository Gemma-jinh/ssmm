require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Account = require("./models/Account"); // Account 모델의 실제 경로로 수정
const Manager = require("../../models/Manager"); // Manager 모델의 실제 경로로 수정

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/car_registration"; // 환경 변수로 MONGO_URI 설정

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("MongoDB 연결 성공");

    const adminId = "admin123"; // 원하는 관리자 ID로 변경
    const adminName = "관리자"; // 원하는 관리자 이름으로 변경
    const password = "password123"; // 원하는 비밀번호로 변경
    const authorityGroup = "관리자";

    // 이미 관리자 계정이 존재하는지 확인
    const adminCount = await Account.countDocuments({
      authorityGroup: "관리자",
    });
    if (adminCount > 0) {
      console.log("이미 관리자 계정이 존재합니다.");
      mongoose.disconnect();
      process.exit(0);
    }

    // 관리자 ID 중복 확인
    const existingAccount = await Account.findOne({ adminId });
    if (existingAccount) {
      console.log("이미 사용 중인 관리자 ID입니다.");
      mongoose.disconnect();
      process.exit(0);
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 관리자 계정 생성
    const newAccount = new Account({
      adminId,
      adminName,
      password: hashedPassword,
      authorityGroup,
      customer: null, // 관리자에게 고객사가 필요 없을 경우 null로 설정
    });

    await newAccount.save();
    console.log("관리자 계정이 성공적으로 생성되었습니다.");

    // Manager 생성 (선택 사항)
    const existingManager = await Manager.findOne({ name: adminName });
    if (!existingManager) {
      const newManager = new Manager({
        name: adminName,
        // 추가 필드가 필요하다면 여기서 설정
      });
      await newManager.save();
      console.log(`Manager ${adminName} 생성 완료`);
    } else {
      console.warn(`Manager with name ${adminName} already exists`);
    }

    mongoose.disconnect();
  })
  .catch((err) => {
    console.error("MongoDB 연결 실패:", err);
  });
