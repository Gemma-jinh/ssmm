require("dotenv").config();
const dotenv = require("dotenv");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path"); //경로 관련 모듈 추가
const multer = require("multer");
const XLSX = require("xlsx");
const util = require("util");
const fs = require("fs/promises");
const bcryptjs = require("bcryptjs");
const Region = require("./models/Region");
const Manager = require("./models/Manager"); // 담당자 모델
const Team = require("./models/Team"); // 팀 모델
const jwt = require("jsonwebtoken");
const { Console } = require("console");
// const Place = require("./models/Place");

// Promisify fs functions
// const mkdir = util.promisify(fs.mkdir);
// const stat = util.promisify(fs.stat);
// const access = util.promisify(fs.access);
// const unlink = util.promisify(fs.unlink);

console.log("Current working directory:", process.cwd());

//환경 변수 설정
// const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "gemma-jinh"; // 환경 변수에서 JWT_SECRET 가져오기
// const MONGO_URI = "mongodb://localhost:27017/car_registration";
const MONGO_URI = process.env.MONGO_URI;
console.log("MONGO_URI:", MONGO_URI);

const app = express();
const router = express.Router();

app.set("timeout", 120000);
// 미들웨어 설정
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

// app.use("/style", express.static(path.join(__dirname, "public", "style")));
// app.use("/js", express.static(path.join(__dirname, "public", "js")));
// app.use("/images", express.static(path.join(__dirname, "public", "images")));
app.use(express.static(path.join(__dirname, "public")));
const PUBLIC_PATHS = ["/login.html", "/style", "/js", "/images", "/api/login"];
// app.use(express.static(path.join(__dirname, "public")));

// router.post("/api/verify-token", (req, res) => {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1];

//   if (!token) {
//     return res.json({ valid: false });
//   }

//   try {
//     const decoded = jwt.verify(token, JWT_SECRET);
//     res.json({
//       valid: true,
//       authorityGroup: decoded.authorityGroup,
//       adminId: decoded.adminId,
//     });
//   } catch (err) {
//     console.error("Token verification error:", err);
//     res.json({ valid: false });
//   }
// });

// const authenticateToken = (req, res, next) => {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1];

//   if (!token) {
//     return res.status(401).json({ error: "토큰이 필요합니다." });
//   }

const authenticateToken = (req, res, next) => {
  console.log("인증 미들웨어 실행");
  console.log("Method:", req.method);
  console.log("Path:", req.path);
  console.log("Headers:", req.headers);

  // if (
  //   req.path === "/login.html" ||
  //   req.path === "/api/login" ||
  //   req.path.startsWith("/static/")
  // ) {
  //   return next();
  // }

  if (PUBLIC_PATHS.some((path) => req.path.startsWith(path))) {
    return next();
  }
  // POST 요청의 body에서 토큰 확인
  // const bodyToken = req.body?.token;
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader) {
    // console.log("Authorization 헤더 없음");
    // if (req.xhr || req.headers.accept.includes("application/json")) {
    //   return res.status(401).json({ error: "토큰이 필요합니다." });
    // }
    // return res.redirect("/login.html");
    token = authHeader.split(" ")[1];
  }
  // 토큰 우선순위: Authorization 헤더 > body
  // const token = headerToken || bodyToken;
  if (!token && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    console.log("토큰 형식 잘못됨");
    if (req.path === "/api/reports/weekly/excel") {
      return res.status(401).json({ error: "토큰이 필요합니다." });
    }
    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.status(401).json({ error: "올바른 토큰 형식이 아닙니다." });
    }
    return res.redirect("/login.html");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("토큰 검증 성공:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("토큰 검증 실패:", err);
    if (req.path === "/api/reports/weekly/excel") {
      return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
    }
    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
    }
    return res.redirect("/login.html");
  }
};

// 권한 검사 미들웨어 정의
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.authorityGroup)) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }
    next();
  };
};

const apiRouter = express.Router();

// 로그인 라우트
apiRouter.post("/login", async (req, res) => {
  const { adminId, password } = req.body;

  // 입력값 검증
  if (!adminId || !password) {
    return res.status(400).json({
      success: false,
      error: "아이디와 비밀번호를 모두 입력해주세요.",
    });
  }

  // 계정 찾기
  try {
    const account = await Account.findOne({ adminId }).populate("customer");

    if (!account) {
      return res.status(401).json({
        success: false,
        error: "존재하지 않는 아이디입니다.",
      });
    }

    // 비밀번호 확인
    const isMatch = await bcryptjs.compare(password, account.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "비밀번호가 일치하지 않습니다.",
      });
    }

    // 토큰 생성
    const token = jwt.sign(
      {
        id: account._id,
        adminId: account.adminId,
        adminName: account.adminName,
        authorityGroup: account.authorityGroup,
        customer: account.customer?._id,
        managerId: account.manager ? account.manager.toString() : null,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );
    console.log("로그인 성공:", {
      adminId,
      authorityGroup: account.authorityGroup,
    });
    // 성공 응답
    res.json({
      success: true,
      token,
      user: {
        adminId: account.adminId,
        adminName: account.adminName,
        authorityGroup: account.authorityGroup,
      },
    });
  } catch (err) {
    console.error("로그인 처리 중 오류:", err);
    res.status(500).json({
      success: false,
      error: "서버 오류가 발생했습니다.",
    });
  }
});

// 토큰 검증 라우트
apiRouter.post("/verify-token", authenticateToken, (req, res) => {
  if (req.user) {
    res.json({
      success: true,
      user: {
        adminId: req.user.adminId,
        adminName: req.user.adminName,
        authorityGroup: req.user.authorityGroup,
      },
    });
  } else {
    res
      .status(401)
      .json({ success: false, error: "유효하지 않은 토큰입니다." });
  }
});

// 파일 저장 경로 설정 및 폴더 생성
const uploadDir = path.join(__dirname, "uploads");
console.log("Upload directory:", uploadDir);

// 디렉토리 생성 함수
// async function ensureDir(dirpath) {
//   try {
//     await fs.mkdir(dirpath, { recursive: true });
//     console.log(`Directory created or already exists: ${dirpath}`);
//     const stats = await fs.stat(dirpath);
//     console.log(`Directory permissions: ${stats.mode}`);
//   } catch (err) {
//     console.error(`Error creating/checking directory ${dirpath}:`, err);
//     throw err;
//   }
// }
async function ensureUploadDirectory() {
  try {
    await fs.mkdir("uploads", { recursive: true });
    console.log("Upload directory created or already exists");
  } catch (err) {
    console.error("Error creating upload directory:", err);
    throw err;
  }
}

// 서버 시작 시 업로드 디렉토리 생성 확인
// ensureDir(uploadDir).catch((err) => {
//   console.error("Failed to create upload directory:", err);
//   process.exit(1);
// });
ensureUploadDirectory();

// 파일 저장 경로 설정
const storage = multer
  .memoryStorage
  // {
  //diskStorage -> memoryStorage
  // destination: function (req, file, cb) {
  // console.log(
  //   "Multer destination function called. Upload directory:",
  //   uploadDir
  // );
  // cb(null, "uploads/");
  //     const uploadDir = path.join(__dirname, "uploads");
  //     cb(null, uploadDir);
  //   },
  //   filename: function (req, file, cb) {
  //     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  //     const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "");
  //     const fileName = uniqueSuffix + "-" + safeName;
  //     console.log("Generated filename:", fileName);
  //     cb(null, fileName);
  //   },
  // }
  ();

// 파일 필터링 (엑셀 파일만 허용)
const excelFileFilter = (req, file, cb) => {
  console.log(
    "Filtering file:",
    file.originalname,
    "MIME type:",
    file.mimetype
  );
  const allowedMimes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/octet-stream", // 일부 브라우저에서 이 MIME 타입을 사용할 수 있음
    "application/haansoftxlsx", // 한글 오피스 엑셀 파일 MIME 타입
  ];

  const allowedExtensions = /xlsx|xls$/i;

  if (
    allowedMimes.includes(file.mimetype) ||
    allowedExtensions.test(path.extname(file.originalname))
  ) {
    cb(null, true);
  } else {
    cb(new Error("엑셀 파일(.xlsx, .xls)만 업로드 가능합니다."), false);
  }
};

const uploadExcel = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 파일 크기 제한 (10MB)
  },
  fileFilter: excelFileFilter,
});

const uploadImages = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  // fileFilter: function (req, file, cb) {
  //   if (file.mimetype.startsWith("image/")) {
  //     cb(null, true);
  //   } else {
  //     cb(new Error("이미지 파일만 업로드 가능"));
  //   }
  // },
});

// const upload = multer({
//   storage: storage,
//   limits: {
//     fileSize: 10 * 1024 * 1024,
//   },
//   fileFilter: function (req, file, cb) {
//     if (file.mimetype.startsWith("image/")) {
//       cb(null, true);
//     } else {
//       cb(new Error("이미지 파일만 업로드 가능"));
//     }
//   },
// });

// 데이터 스키마 정의
const CarTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

const CarModelSchema = new mongoose.Schema({
  type: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CarType",
    required: true,
  },
  name: { type: String, required: true },
});

CarModelSchema.index({ type: 1, name: 1 }, { unique: true });

const CarRegistrationSchema = new mongoose.Schema(
  {
    type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CarType",
      required: true,
    },
    model: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CarModel",
      required: true,
    },
    licensePlate: { type: String, required: true, unique: true },
    location: {
      region: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Region",
        required: true,
      },
      place: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Place",
        required: true,
      },
      parkingSpot: { type: String, default: "" },
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manager",
      default: null,
    },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
    serviceType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceType",
    },
    serviceAmountType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceAmountType",
    },
    serviceAmount: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    assignDate: { type: Date, default: Date.now },
    workDate: { type: Date },
    status: {
      type: String,
      enum: ["emergency", "complete", "pending"],
      default: "pending",
    },

    // 사진 필드 추가
    externalPhoto: { type: String, default: "" },
    internalPhoto: { type: String, default: "" },
  },
  {
    timestamps: true,
    // createdAt: { type: Date, default: Date.now },
  }
);

// Account 모델 정의
const accountSchema = new mongoose.Schema({
  adminId: { type: String, required: true, unique: true },
  adminName: { type: String, required: true },
  password: { type: String, required: true },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: function () {
      return this.authorityGroup !== "관리자";
    },
    default: null,
  },
  authorityGroup: { type: String, enum: ["관리자", "작업자"], required: true },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: "Manager" },
  status: {
    type: String,
    enum: ["active", "withdrawn"],
    default: "active",
  },
  withdrawalDate: {
    type: Date,
    default: null,
  },
});

const Account =
  mongoose.models.Account || mongoose.model("Account", accountSchema);

// 모델 생성
const CarType = mongoose.model("CarType", CarTypeSchema);
const CarModel = mongoose.model("CarModel", CarModelSchema);
const CarRegistration = mongoose.model(
  "CarRegistration",
  CarRegistrationSchema
);

//고객사 스키마 정의
const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // 고객사명
  display: { type: Boolean, default: true }, // 고객사 표기 여부
  createdAt: { type: Date, default: Date.now },
});

// 고객사 모델 생성
const Customer = mongoose.model("Customer", CustomerSchema);
// const Customer = require("./models/Customer");

const PlaceSchema = new mongoose.Schema({
  region: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Region",
    required: true,
  },
  name: { type: String, required: true },
  address: { type: String, required: true },
  order: { type: Number, default: 0 },
  parkingSpot: [{ type: String }],
});

const Place = mongoose.model("Place", PlaceSchema);

const ServiceTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

const ServiceType = mongoose.model("ServiceType", ServiceTypeSchema);

// 서비스 금액 타입 모델 (models/ServiceAmountType.js)

const ServiceAmountTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

const ServiceAmountType = mongoose.model(
  "ServiceAmountType",
  ServiceAmountTypeSchema
);

//초기 데이터 삽입
async function insertInitialData() {
  try {
    // 서비스 종류 초기 데이터
    const serviceTypes = [
      "주1회",
      "주2회",
      "주3회",
      "주4회",
      "주5회",
      "일세차",
      "월세차 8회",
      "월세차 12회",
    ];
    for (const name of serviceTypes) {
      const existing = await ServiceType.findOne({ name });
      if (!existing) {
        const serviceType = new ServiceType({ name });
        await serviceType.save();
      }
    }
    console.log("서비스 종류 초기 데이터 삽입 완료");

    // 서비스 금액 타입 초기 데이터
    const amountTypes = ["일할", "단가", "무료"];
    for (const name of amountTypes) {
      const existing = await ServiceAmountType.findOne({ name });
      if (!existing) {
        const amountType = new ServiceAmountType({ name });
        await amountType.save();
      }
    }
    console.log("서비스 금액 타입 초기 데이터 삽입 완료");

    console.log("모든 초기 데이터 삽입 완료");
  } catch (err) {
    console.error("초기 데이터 삽입 중 오류 발생:", err);
  }
}

// 장소별 주차 위치 초기 설정
async function setInitialParkingSpots() {
  const placeParkingSpots = {
    삼성_수원: ["A", "B", "C"],
    삼성_서초사옥: ["서초사옥", "서초사옥 A동", "태평로"],
    에스원_서초사옥: ["서초사옥"],
    "R&D캠퍼스_우면": ["DE tower", "F tower", "C tower"],
    한국총괄_대륭: ["대륭", "358"],
    전자판매_대륭: ["358"],
    "202경비단": ["효창", "한남"],
  };

  try {
    for (const [placeName, spots] of Object.entries(placeParkingSpots)) {
      const place = await Place.findOne({ name: placeName });
      if (place) {
        if (!place.parkingSpot || !arrayEquals(place.parkingSpot, spots)) {
          place.parkingSpot = spots;
          await place.save();
          console.log(`${placeName} 주차 위치 설정 완료:`, spots);
        }
      } else {
        console.log(`${placeName} 장소를 찾을 수 없습니다.`);
      }
    }
    console.log("모든 장소의 주차 위치 설정이 완료되었습니다.");
  } catch (err) {
    console.error("주차 위치 초기 설정 오류:", err);
  }
}

// 초기 관리자 계정 생성 함수
async function createInitialAdmin() {
  try {
    const existingAdmin = await Account.findOne({ authorityGroup: "관리자" });
    if (!existingAdmin) {
      const hashedPassword = await bcryptjs.hash("1234", 10);
      const adminAccount = new Account({
        adminId: "admin",
        adminName: "관리자",
        password: hashedPassword,
        authorityGroup: "관리자",
        customer: null,
      });
      await adminAccount.save();
      console.log("초기 관리자 계정이 생성되었습니다.");
    }
  } catch (err) {
    console.error("초기 관리자 계정 생성 실패:", err);
  }
}

// 배열 비교 헬퍼 함수
function arrayEquals(a, b) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index])
  );
}

async function migrateCarStatus() {
  try {
    console.log("Starting car status migration...");

    // status 필드가 없거나 null인 차량 찾기
    const result = await CarRegistration.updateMany(
      {
        $or: [{ status: { $exists: false } }, { status: null }],
      },
      {
        $set: { status: "pending" },
      }
    );

    console.log(
      `Car status migration completed: ${result.modifiedCount} documents updated`
    );
  } catch (err) {
    console.error("Car status migration failed:", err);
  }
}

// DB 연결
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB 연결 성공");
    await migrateCarStatus();
    const defaultCarTypes = ["승용", "승합", "기타"];

    try {
      // 기존 데이터 모두 삭제
      //   await CarType.deleteMany({});
      //   console.log("기존 차종 데이터 삭제 완료");

      for (const typeName of defaultCarTypes) {
        const existingType = await CarType.findOne({ name: typeName });
        if (!existingType) {
          const newCarType = new CarType({ name: typeName });
          await newCarType.save();
          console.log(`차종 ${typeName} 생성 완료`);
        }
      }

      console.log("차종 초기화 완료");
    } catch (err) {
      console.error("차종 데이터 초기화 오류:", err);
    }

    //   await CarType.insertMany(defaultCarTypes.map((name) => ({ name })));
    //   console.log("새로운 차종이 추가되었습니다.");
    // } catch (err) {
    //   console.error("차종 데이터 초기화 오류:", err);
    // }
    // CarType.find()
    //   .then((existingTypes) => {
    //     if (existingTypes.length === 0) {
    //       return CarType.insertMany(defaultCarTypes.map((name) => ({ name })));
    //     }
    //   })
    //   .then(() => {
    //     console.log("기본 차종이 추가되었습니다.");
    //   })
    //   .catch((err) => {
    //     console.error("기본 차종 추가 오류:", err);
    //  });

    // 기본 팀 설정
    const defaultTeams = ["A팀", "B팀", "C팀"];
    for (const teamName of defaultTeams) {
      const existingTeam = await Team.findOne({ name: teamName });
      if (!existingTeam) {
        const team = new Team({ name: teamName });
        await team.save();
        console.log(`기본 팀 ${teamName} 생성 완료`);
      }
    }
    // 초기 서비스 종류 및 금액 타입 데이터 삽입
    try {
      await insertInitialData();
      await setInitialParkingSpots();
    } catch (err) {
      console.error("초기 데이터 삽입 실패:", err);
    }
    // 초기 관리자 계정 생성
    // await createInitialAdmin();

    // const carsWithoutAssignDate = await CarRegistration.find({
    //   assignDate: { $exists: false },
    // });

    // console.log(
    //   `assignDate가 없는 차량 문서 수: ${carsWithoutAssignDate.length}`
    // );

    // 각 문서에 assignDate 추가 (예: createdAt과 동일하게 설정)
    // for (let car of carsWithoutAssignDate) {
    //   car.assignDate = car.createdAt;
    //   await car.save();
    //   console.log(`차량 ID ${car._id}에 assignDate 추가 완료.`);
    // }
  })
  .catch((err) => console.error("MongoDB 연결 실패:", err));

// API 엔드포인트
// app.get("/login.html", (req, res) => {
//   res.sendFile(path.join(__dirname, "../public", "login.html"));
// });

// 로그인 페이지 라우트
const filePath = path.join(__dirname, "public", "login.html");
// router.get("/login.html", async (req, res) => {
//   const filePath = path.join(__dirname, "../public", "login.html");
//   console.log("Attempting to send file:", filePath);
//   try {
//     await fs.access(filePath, fs.constants.R_OK);
//     res.sendFile(filePath);
//     console.log("File sent successfully:", filePath);
//   } catch (err) {
//     console.error("File not found or inaccessible:", filePath, err);
//     res.status(500).send("로그인 페이지를 찾을 수 없습니다.");
//   }
// });

// 특정 라우트 정의
// router.get("/car-list.html", (req, res) => {
//   const filePath = path.join(__dirname, "public", "pages", "car-list.html");
//   res.sendFile(filePath, (err) => {
//     if (err) {
//       console.error("Error sending file:", err);
//       res.status(500).send("차량 목록 페이지를 찾을 수 없습니다.");
//     }
//   });
// });

// 모든 기타 라우트는 로그인 페이지로 리디렉션 (SPA 용)

// app.get("*", (req, res) => {
//   const filePath = path.join(__dirname, "../public", "login.html");
//   console.log(
//     "Redirecting to login page:",
//     filePath,
//     "for request:",
//     req.originalUrl
//   );
//   res.sendFile(filePath, (err) => {
//     if (err) {
//       console.error("Error sending file:", err);
//       res.status(500).send("파일 전송 중 오류가 발생했습니다.");
//     }
//   });
// });

// 2. 인증 미들웨어 추가
// router.post("/verify-token", (req, res) => {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

//   if (!token) {
//     return res.json({ valid: false });
//   }

//   jwt.verify(token, JWT_SECRET, (err, decoded) => {
//     if (err) {
//       return res.json({ valid: false });
//     }
//     res.json({
//       valid: true,
//       authorityGroup: decoded.authorityGroup,
//     });
//   });
// });

// 3. 권한 부여 미들웨어 추가
// function authorizeRoles(...allowedRoles) {
//   return (req, res, next) => {
//     if (!allowedRoles.includes(req.user.authorityGroup)) {
//       return res.status(403).json({ error: "권한이 없습니다." });
//     }
//     next();
//   };
// }

apiRouter.get(
  "/car-registrations",
  authenticateToken,
  authorizeRoles("관리자", "작업자"),
  async (req, res) => {
    try {
      console.log("Request query:", req.query);
      const {
        type,
        model,
        licensePlate,
        locationRegion,
        locationPlace,
        locationParkingSpot,
        customer,
        manager,
        status,
        assignDate,
        page = 1,
        limit = 10,
      } = req.query;

      // 필터 객체 초기화
      let filter = {};

      if (type) {
        filter.type = type; // type은 ObjectId로 전달된다고 가정
      }

      // 차량 모델 필터 적용
      if (model) {
        filter.model = model; // model도 ObjectId로 전달
      }

      // 차량 번호 필터 적용 (부분 일치)
      if (licensePlate) {
        filter.licensePlate = { $regex: licensePlate, $options: "i" };
      }

      // 지역 필터 적용
      if (locationRegion) {
        filter["location.region"] = locationRegion;
      }

      // 장소 필터 적용
      if (locationPlace) {
        filter["location.place"] = locationPlace;
      }

      // 주차 위치 필터 적용
      if (locationParkingSpot) {
        filter["location.parkingSpot"] = locationParkingSpot;
      }

      // 고객사 필터 적용
      if (customer) {
        filter.customer = customer;
      }

      // 작업자 필터 적용
      if (manager) {
        filter.manager = manager;
      }

      // if (type) filter.type = new mongoose.Types.ObjectId(type);
      // if (model) filter.model = new mongoose.Types.ObjectId(model);
      // if (licensePlate)
      //   filter.licensePlate = { $regex: licensePlate, $options: "i" };
      // if (region)
      //   filter["location.region"] = new mongoose.Types.ObjectId(region);
      // if (place) filter["location.place"] = new mongoose.Types.ObjectId(place);
      // if (customer) filter.customer = new mongoose.Types.ObjectId(customer);
      // if (manager) filter.manager = new mongoose.Types.ObjectId(manager);

      // if (type) filter.type = new mongoose.Types.ObjectId(type);
      // if (model) filter.model = new mongoose.Types.ObjectId(model);
      // if (region)
      //   filter["location.region"] = new mongoose.Types.ObjectId(region);
      // if (place) filter["location.place"] = new mongoose.Types.ObjectId(place);
      // if (customer) filter.customer = new mongoose.Types.ObjectId(customer);
      // if (manager) filter.manager = new mongoose.Types.ObjectId(manager);

      // if (licensePlate) {
      //   filter.licensePlate = { $regex: licensePlate, $options: "i" };
      // }
      // if (locationParkingSpot) {
      //   filter["location.parkingSpot"] = { $regex: parkingSpot, $options: "i" };
      // }

      // if (req.user.authorityGroup === "작업자") {
      //   const account = await Account.findById(req.user.id).populate("manager");
      //   if (!account || !account.manager) {
      //     return res
      //       .status(403)
      //       .json({ error: "작업자 정보를 찾을 수 없습니다." });
      //   }
      //   filter.manager = account.manager._id;
      // }

      // if (status && status !== "all") {
      //   filter.status = status;
      // }

      // if (status) {
      //   if (status === "all") {
      //     filter.status = { $in: ["pending", "complete", "emergency"] };
      //   } else {
      //     filter.status = status;
      //   }
      // }

      // if (status) {
      //   if (status === "all") {
      //     filter.status = { $in: ["pending", "complete", "emergency"] };
      //   } else {
      //     filter.status = status;
      //   }
      // } else {
      //   filter.status = { $in: ["pending", "complete", "emergency"] };
      // }

      if (status && status !== "all") {
        filter.status = status;
        // } else {
        //   const statusConditions = [
        //     { status: { $in: ["pending", "complete", "emergency"] } },
        //     { status: { $exists: false } },
        //     { status: null },
        //   ];

        //   if (Object.keys(filter).length > 0) {
        //     filter = {
        //       $and: [filter, { $or: statusConditions }],
        //     };
      } else {
        // filter.$or = statusConditions;
        filter.$or = [
          { status: { $in: ["pending", "complete", "emergency"] } },
          { status: { $exists: false } },
          { status: null },
        ];
      }
      // }
      // 작업일자 필터 적용

      if (assignDate) {
        const startAssignDate = new Date(assignDate);
        startAssignDate.setHours(0, 0, 0, 0);
        const endAssignDate = new Date(assignDate);
        endAssignDate.setHours(23, 59, 59, 999);

        filter.assignDate = {
          $gte: startAssignDate,
          $lte: endAssignDate,
        };
      }

      if (req.user.authorityGroup === "작업자") {
        const account = await Account.findById(req.user.id).populate("manager");
        if (!account || !account.manager) {
          return res
            .status(403)
            .json({ error: "작업자 정보를 찾을 수 없습니다." });
        }
        filter.manager = account.manager._id;
      }
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const total = await CarRegistration.countDocuments(filter);
      const cars = await CarRegistration.find(filter)
        // .populate("type", "name")
        // .populate("model", "name")
        // .populate("customer", "name")
        // .populate("location.region", "name")
        // .populate({
        //   path: "location.place",
        //   select: "name address",
        // })
        // .populate("manager", "name")
        // .populate("team", "name")
        // .populate("serviceType", "name")
        // .populate("serviceAmountType", "name")
        // .populate({
        //   path: "type",
        //   select: "name",
        // })
        // .populate({
        //   path: "model",
        //   select: "name",
        // })
        // .populate({
        //   path: "customer",
        //   select: "name",
        // })
        // .populate({
        //   path: "location.region",
        //   select: "name",
        // })
        // .populate({
        //   path: "location.place",
        //   select: "name address",
        // })
        // .populate({
        //   path: "manager",
        //   select: "name",
        // })
        // .populate({
        //   path: "team",
        //   select: "name",
        // })
        .populate("model")
        .populate("type")
        .populate("customer")
        .populate("location.region")
        .populate("location.place")
        .populate("manager")
        // .populate("team")
        // .populate({
        //   path: "type",
        //   select: "name",
        // })
        // .populate({
        //   path: "model",
        //   select: "name",
        // })
        // .populate({
        //   path: "customer",
        //   select: "name",
        // })
        // .populate({
        //   path: "location.region",
        //   select: "name",
        // })
        // .populate({
        //   path: "location.place",
        //   select: "name address",
        // })
        .skip(skip)
        .limit(parseInt(limit))
        .lean()
        .exec();

      // 응답 데이터 가공
      const formattedCars = cars.map((car) => ({
        // ...car,

        _id: car._id,
        // type: car.type ? car.type.name : "N/A",
        // model: car.model || "N/A",
        model: car.model?.name || "N/A",
        type: car.type?.name || "N/A",
        licensePlate: car.licensePlate || "N/A",
        location: {
          // region: car.location?.region?.name || "N/A",
          place: {
            name: car.location?.place?.name || "N/A",
            address: car.location?.place?.address || "N/A",
          },
          parkingSpot: car.location?.parkingSpot || "N/A",
        },
        // customer: car.customer || "N/A",
        customer: car.customer?.name || "N/A",
        manager: car.manager?.name || "N/A",
        // team: car.team ? car.team.name : "N/A",
        // serviceType: car.serviceType ? car.serviceType.name : "",
        // serviceAmountType: car.serviceAmountType
        //   ? car.serviceAmountType.name
        //   : "",
        // workDate: car.workDate || null,
        // status: car.status || "N/A",
        workDate: car.workDate,
        assignDate: car.assignDate,
        status: car.status || "pending",
      }));

      console.log("Response data:", {
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        carsCount: formattedCars.length,
        statusDistribution: formattedCars.reduce((acc, car) => {
          acc[car.status] = (acc[car.status] || 0) + 1;
          return acc;
        }, {}),
      });

      res.json({
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        cars: formattedCars,
      });
    } catch (err) {
      console.error("차량 목록 조회 오류:", err);
      res.status(500).json({ error: "차량 등록 실패", details: err.message });
    }
  }
);

apiRouter.get(
  "/car-registrations/excel",
  authenticateToken,
  authorizeRoles("관리자"),
  async (req, res) => {
    try {
      // const {
      //   type,
      //   model,
      //   licensePlate,
      //   locationRegion,
      //   locationPlace,
      //   locationParkingSpot,
      //   customer,
      //   manager,
      //   status,
      //   assignDate,
      // } = req.query;

      // 필터 객체 초기화
      let filter = {};

      // 필터 조건 적용
      // if (type) filter.type = type;
      // if (model) filter.model = model;
      // if (licensePlate)
      //   filter.licensePlate = { $regex: licensePlate, $options: "i" };
      // if (locationRegion) filter["location.region"] = locationRegion;
      // if (locationPlace) filter["location.place"] = locationPlace;
      // if (locationParkingSpot)
      //   filter["location.parkingSpot"] = locationParkingSpot;
      // if (customer) filter.customer = customer;
      // if (manager) filter.manager = manager;

      // if (status && status !== "all") {
      //   filter.status = status;
      // } else {
      //   filter.$or = [
      //     { status: { $in: ["pending", "complete", "emergency"] } },
      //     { status: { $exists: false } },
      //     { status: null },
      //   ];
      // }

      if (req.query.type && mongoose.Types.ObjectId.isValid(req.query.type)) {
        filter.type = new mongoose.Types.ObjectId(req.query.type);
      }

      if (req.query.model && mongoose.Types.ObjectId.isValid(req.query.model)) {
        filter.model = new mongoose.Types.ObjectId(req.query.model);
      }

      if (req.query.licensePlate) {
        filter.licensePlate = { $regex: req.query.licensePlate, $options: "i" };
      }

      if (
        req.query.locationRegion &&
        mongoose.Types.ObjectId.isValid(req.query.locationRegion)
      ) {
        filter["location.region"] = new mongoose.Types.ObjectId(
          req.query.locationRegion
        );
      }

      if (
        req.query.locationPlace &&
        mongoose.Types.ObjectId.isValid(req.query.locationPlace)
      ) {
        filter["location.place"] = new mongoose.Types.ObjectId(
          req.query.locationPlace
        );
      }

      if (req.query.locationParkingSpot) {
        filter["location.parkingSpot"] = req.query.locationParkingSpot;
      }

      if (req.query.manager) {
        filter.manager = { $regex: req.query.manager, $options: "i" };
      }

      // 상태 필터 적용
      if (req.query.status && req.query.status !== "all") {
        filter.status = req.query.status;
      } else {
        filter.$or = [
          { status: { $in: ["pending", "complete", "emergency"] } },
          { status: { $exists: false } },
          { status: null },
        ];
      }

      // 작업일자 필터 적용
      if (req.query.assignDate) {
        const startDate = new Date(req.query.assignDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(req.query.assignDate);
        endDate.setHours(23, 59, 59, 999);

        filter.assignDate = {
          $gte: startDate,
          $lte: endDate,
        };
      }

      // 데이터 조회
      const cars = await CarRegistration.find(filter)
        .populate("model")
        .populate("type")
        .populate("customer")
        .populate("location.region")
        .populate("location.place")
        .populate("manager")
        .lean()
        .exec();

      // 엑셀 워크북 생성
      const workbook = XLSX.utils.book_new();

      // 헤더 정의
      const headers = [
        "차량 번호",
        "차종",
        "차량 모델",
        "장소",
        "주차 위치",
        "고객사",
        "담당자",
        "상태",
        "작업일자",
        "배정일자",
      ];

      // 상태 텍스트 변환 함수
      const getStatusText = (status) => {
        switch (status) {
          case "emergency":
            return "긴급세차요청";
          case "complete":
            return "세차완료";
          case "pending":
            return "세차전";
          default:
            return "N/A";
        }
      };

      // 데이터 행 생성
      const excelData = [
        headers,
        ...cars.map((car) => [
          car.licensePlate || "N/A",
          car.type?.name || "N/A",
          car.model?.name || "N/A",
          car.location?.place?.name || "N/A",
          car.location?.parkingSpot || "N/A",
          car.customer?.name || "N/A",
          car.manager?.name || "N/A",
          getStatusText(car.status),
          car.workDate ? new Date(car.workDate).toLocaleDateString() : "N/A",
          car.assignDate
            ? new Date(car.assignDate).toLocaleDateString()
            : "N/A",
        ]),
      ];

      // 워크시트 생성
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);

      // 워크북에 워크시트 추가
      XLSX.utils.book_append_sheet(workbook, worksheet, "차량 목록");

      // 엑셀 파일 버퍼 생성
      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      // 응답 헤더 설정
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=car_list.xlsx"
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      // 파일 전송
      res.send(excelBuffer);
    } catch (error) {
      console.error("엑셀 다운로드 오류:", error);
      res.status(500).json({ error: "엑셀 다운로드 중 오류가 발생했습니다." });
    }
  }
);

// 예시: 관리자 전용 엔드포인트 보호
apiRouter.get(
  "/admin-only", //admin-dashboard
  authenticateToken,
  authorizeRoles("관리자"),
  async (req, res) => {
    res.json({ message: "관리자 전용 데이터" });
  }
);

// 예시: 관리자와 작업자 모두 접근 가능한 엔드포인트
apiRouter.get(
  "/worker-and-admin",
  authenticateToken,
  authorizeRoles("관리자", "작업자"),
  (req, res) => {
    res.json({ message: "작업자 및 관리자 접근 가능 데이터" });
  }
);

// car-list.html 라우트 추가
apiRouter.get(
  "/car-list.html",
  authenticateToken,
  authorizeRoles("관리자"),
  (req, res) => {
    const filePath = path.join(__dirname, "public", "pages", "car-list.html");
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("차량 목록 페이지 전송 오류:", err);
        res.status(500).send("차량 목록 페이지를 찾을 수 없습니다.");
      }
    });
  }
);

// 모든 기타 라우트는 로그인 페이지로 리디렉션
// app.get("*", (req, res) => {
//   const filePath = path.join(__dirname, "../public", "login.html");
//   console.log(
//     "Redirecting to login page:",
//     filePath,
//     "for request:",
//     req.originalUrl
//   );
//   res.sendFile(filePath, (err) => {
//     if (err) {
//       console.error("Error sending file:", err);
//       res.status(500).send("파일 전송 중 오류가 발생했습니다.");
//     }
//   });
// });

// 작업자 페이지 라우트 추가 (필요 시)
apiRouter.get(
  "/pages/car-wash-history.html",
  authenticateToken,
  authorizeRoles("작업자"),
  (req, res) => {
    const filePath = path.join(
      __dirname,
      "public",
      "pages",
      "car-wash-history.html"
    );
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("세차 내역 페이지 전송 오류:", err);
        res.status(500).send("세차 내역 페이지를 찾을 수 없습니다.");
      }
    });
  }
);

apiRouter.get("/regions/name/:regionName", async (req, res) => {
  const { regionName } = req.params;

  if (!regionName) {
    return res.status(400).json({ error: "지역명이 필요합니다." });
  }

  try {
    const region = await Region.findOne({ name: regionName });
    if (!region) {
      return res.status(404).json({ error: "해당 지역을 찾을 수 없습니다." });
    }

    res.json(region);
  } catch (err) {
    console.error("지역 정보 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

apiRouter.get("/regions/name/:regionName/places", async (req, res) => {
  const { regionName } = req.params;
  console.log("Requested region name:", regionName);
  // if (!regionName) {
  //   return res.status(400).json({ error: "지역명이 필요합니다." });
  // }

  try {
    const region = await Region.findOne({ name: regionName });
    console.log("Found region:", region);
    if (!region) {
      return res.status(404).json({ error: "해당 지역을 찾을 수 없습니다." });
    }

    const places = await Place.find({ region: region._id }).sort({ order: 1 });
    console.log("Found places:", places);

    res.json(places || []);
  } catch (err) {
    console.error("장소 목록 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// POST /car-locations 엔드포인트 정의
// router.post("/car-locations", async (req, res) => {
//   try {
//     const { region: regionName, name, address } = req.body;

//     if (!regionName || !name || !address) {
//       return res.status(400).json({ error: "모든 필드를 입력해주세요." });
//     }

//     const regionDoc = await Region.findOne({ name: regionName });
//     if (!regionDoc) {
//       return res
//         .status(404)
//         .json({ error: `존재하지 않는 지역: ${regionName}` });
//     }

//     const existingPlace = await Place.findOne({
//       name: name,
//       region: regionDoc._id,
//     });
//     if (existingPlace) {
//       return res.status(400).json({ error: "이미 존재하는 장소명입니다." });
//     }

//     const newPlace = new Place({
//       region: regionDoc._id,
//       name: name,
//       address: address,
//     });

//     await newPlace.save();

//     res.status(201).json({
//       message: "장소가 성공적으로 등록되었습니다.",
//       place: newPlace,
//     });
//   } catch (err) {
//     console.error("장소 등록 오류:", err);
//     res.status(500).json({ error: "서버 오류" });
//   }
// });

// DELETE /car-locations/:id 엔드포인트 정의
// router.delete("/car-locations/:id", async (req, res) => {
//   const { id } = req.params;

//   try {
//     const deletedPlace = await CarLocation.findByIdAndDelete(id);
//     if (!deletedPlace) {
//       return res.status(404).json({ error: "해당 장소를 찾을 수 없습니다." });
//     }
//     res.json({ message: "장소가 성공적으로 삭제되었습니다." });
//   } catch (err) {
//     console.error("장소 삭제 오류:", err);
//     res
//       .status(500)
//       .json({ error: "서버 오류로 인해 장소 삭제에 실패했습니다." });
//   }
// });

// GET /regions - 지역 리스트 조회
apiRouter.get("/regions", async (req, res) => {
  try {
    const regions = await Region.find().sort({ order: 1 });
    res.json(regions);
  } catch (err) {
    console.error("지역 목록 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// POST /regions - 새로운 지역 등록
apiRouter.post("/regions", async (req, res) => {
  const { regions } = req.body;

  // 필수 필드 검증
  if (!regions || !Array.isArray(regions)) {
    return res.status(400).json({ error: "유효하지 않은 지역 데이터입니다." });
  }
  try {
    // 기존 지역 모두 삭제
    await Region.deleteMany({});

    // 중복된 지역 이름 검사 (서버 측에서도 방지)
    const uniqueRegionsMap = {};
    for (let region of regions) {
      if (!region.name || typeof region.order !== "number") {
        return res
          .status(400)
          .json({ error: "모든 지역은 이름과 순서를 가져야 합니다." });
      }
      if (uniqueRegionsMap[region.name]) {
        return res
          .status(400)
          .json({ error: `중복된 지역 이름: ${region.name}` });
      }
      uniqueRegionsMap[region.name] = region;
    }

    const uniqueRegions = Object.values(uniqueRegionsMap);

    // 지역 데이터 삽입
    const savedRegions = await Region.insertMany(uniqueRegions);

    res.status(201).json({
      message: "지역이 성공적으로 저장되었습니다.",
      regions: savedRegions,
    });
  } catch (err) {
    console.error("지역 저장 오류:", err);
    if (err.code === 11000) {
      // MongoDB 중복 키 오류 코드
      return res.status(400).json({ error: "이미 존재하는 지역 이름입니다." });
    }
    res.status(500).json({ error: "서버 오류" });
  }
});

// 서비스 종류 목록 조회
apiRouter.get("/service-types", async (req, res) => {
  try {
    const serviceTypes = await ServiceType.find().sort({ name: 1 });
    res.json(serviceTypes);
  } catch (err) {
    console.error("서비스 종류 목록 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 새로운 서비스 종류 추가 (필요한 경우)
apiRouter.post("/service-types", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "서비스 종류명을 입력해주세요." });
    }

    const existingServiceType = await ServiceType.findOne({ name });
    if (existingServiceType) {
      return res
        .status(400)
        .json({ error: "이미 존재하는 서비스 종류입니다." });
    }

    const newServiceType = new ServiceType({ name });
    await newServiceType.save();

    res.status(201).json(newServiceType);
  } catch (err) {
    console.error("서비스 종류 추가 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 서비스 금액 타입 목록 조회
apiRouter.get("/service-amount-types", async (req, res) => {
  try {
    const amountTypes = await ServiceAmountType.find().sort({ name: 1 });
    res.json(amountTypes);
  } catch (err) {
    console.error("서비스 금액 타입 목록 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 새로운 서비스 금액 타입 추가 (필요한 경우)
apiRouter.post("/service-amount-types", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ error: "서비스 금액 타입명을 입력해주세요." });
    }

    const existingAmountType = await ServiceAmountType.findOne({ name });
    if (existingAmountType) {
      return res
        .status(400)
        .json({ error: "이미 존재하는 서비스 금액 타입입니다." });
    }

    const newAmountType = new ServiceAmountType({ name });
    await newAmountType.save();

    res.status(201).json(newAmountType);
  } catch (err) {
    console.error("서비스 금액 타입 추가 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// PUT /regions/:id - 특정 지역 수정
apiRouter.put("/regions/:id", async (req, res) => {
  const { id } = req.params;
  const { name, order } = req.body;

  // 유효한 MongoDB ObjectId인지 확인
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "유효하지 않은 지역 ID입니다." });
  }

  try {
    const region = await Region.findById(id);
    if (!region) {
      return res.status(404).json({ error: "해당 지역을 찾을 수 없습니다." });
    }

    // 지역명 중복 확인
    if (name && name !== region.name) {
      const existingRegion = await Region.findOne({ name });
      if (existingRegion) {
        return res.status(400).json({ error: "이미 존재하는 지역명입니다." });
      }
      region.name = name;
    }

    if (typeof order === "number") {
      region.order = order;
    }

    await region.save();
    res.json({
      message: "지역이 성공적으로 수정되었습니다.",
      region,
    });
  } catch (err) {
    console.error("지역 수정 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// DELETE /regions/:id - 특정 지역 삭제
apiRouter.delete("/regions/:id", async (req, res) => {
  const { id } = req.params;

  // 유효한 MongoDB ObjectId인지 확인
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "유효하지 않은 지역 ID입니다." });
  }

  try {
    // 해당 지역에 속한 장소가 있는지 확인
    const associatedPlaces = await Place.findOne({ region: id });
    if (associatedPlaces) {
      return res.status(400).json({
        error: "해당 지역에 속한 장소가 있습니다. 먼저 장소를 삭제해주세요.",
      });
    }

    const deletedRegion = await Region.findByIdAndDelete(id);
    if (!deletedRegion) {
      return res.status(404).json({ error: "해당 지역을 찾을 수 없습니다." });
    }

    res.json({ message: "지역이 성공적으로 삭제되었습니다." });
  } catch (err) {
    console.error("지역 삭제 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// GET /regions/:regionId 엔드포인트 정의
apiRouter.get("/regions/:regionId", async (req, res) => {
  const { regionId } = req.params;

  // 유효한 MongoDB ObjectId인지 확인
  if (!mongoose.Types.ObjectId.isValid(regionId)) {
    return res.status(400).json({ error: "유효하지 않은 지역 ID입니다." });
  }

  try {
    const region = await Region.findById(regionId);
    if (!region) {
      return res.status(404).json({ error: "해당 지역을 찾을 수 없습니다." });
    }

    res.json(region);
  } catch (err) {
    console.error("지역 정보 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// GET /regions/:regionId/places - 특정 지역의 장소 리스트 조회
apiRouter.get("/regions/:regionId/places", async (req, res) => {
  const { regionId } = req.params;

  // 유효한 MongoDB ObjectId인지 확인
  if (!mongoose.Types.ObjectId.isValid(regionId)) {
    return res.status(400).json({ error: "유효하지 않은 지역 ID입니다." });
  }

  try {
    const places = await Place.find({ region: regionId }).sort({ order: 1 });
    res.json(places);
  } catch (err) {
    console.error("장소 목록 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

apiRouter.delete(
  "/regions/name/:regionName/places/:placeId",
  async (req, res) => {
    const { regionName, placeId } = req.params;

    if (!regionName) {
      return res.status(400).json({ error: "지역명이 필요합니다." });
    }

    if (!mongoose.Types.ObjectId.isValid(placeId)) {
      return res.status(400).json({ error: "유효하지 않은 장소 ID입니다." });
    }

    try {
      const region = await Region.findOne({ name: regionName });
      if (!region) {
        return res.status(404).json({ error: "해당 지역을 찾을 수 없습니다." });
      }

      const deletedPlace = await Place.findOneAndDelete({
        _id: placeId,
        region: region._id,
      });

      if (!deletedPlace) {
        return res.status(404).json({ error: "해당 장소를 찾을 수 없습니다." });
      }

      res.json({ message: "장소가 성공적으로 삭제되었습니다." });
    } catch (err) {
      console.error("장소 삭제 오류:", err);
      res.status(500).json({ error: "서버 오류" });
    }
  }
);

// DELETE /regions/:regionId/places/:placeId 엔드포인트 정의
apiRouter.delete("/regions/:regionId/places/:placeId", async (req, res) => {
  const { regionId, placeId } = req.params;

  // 유효한 MongoDB ObjectId인지 확인
  if (!mongoose.Types.ObjectId.isValid(regionId)) {
    return res.status(400).json({ error: "유효하지 않은 지역 ID입니다." });
  }

  if (!mongoose.Types.ObjectId.isValid(placeId)) {
    return res.status(400).json({ error: "유효하지 않은 장소 ID입니다." });
  }

  try {
    // 해당 지역이 실제로 존재하는지 확인
    const region = await Region.findById(regionId);
    if (!region) {
      return res.status(404).json({ error: "해당 지역을 찾을 수 없습니다." });
    }

    // 장소 삭제
    const deletedPlace = await Place.findOneAndDelete({
      _id: placeId,
      region: regionId,
    });
    if (!deletedPlace) {
      return res.status(404).json({ error: "해당 장소를 찾을 수 없습니다." });
    }

    res.json({ message: "장소가 성공적으로 삭제되었습니다." });
  } catch (err) {
    console.error("장소 삭제 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

apiRouter.post("/regions/name/:regionName/places", async (req, res) => {
  const { regionName } = req.params;
  const { name, address, order } = req.body;
  console.log("Creating place:", { regionName, name, address, order });
  // const { name, address, order } = req.body;

  // if (!name || !address || typeof order !== "number") {
  //   return res
  //     .status(400)
  //     .json({ error: "장소명, 주소, 순서를 모두 입력해주세요." });
  // }

  try {
    const region = await Region.findOne({ name: regionName });
    console.log("Found region:", region);

    if (!region) {
      console.log("Region not found for name:", regionName);
      return res.status(404).json({ error: "해당 지역을 찾을 수 없습니다." });
    }

    const newPlace = new Place({
      region: region._id,
      name,
      address,
      order: order || 0,
    });
    await newPlace.save();
    console.log("Place created:", newPlace);
    res.status(201).json({
      message: "장소가 성공적으로 등록되었습니다.",
      place: newPlace,
    });
  } catch (err) {
    console.error("장소 등록 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// POST /regions/:regionId/places - 특정 지역에 새로운 장소 등록
apiRouter.post("/regions/:regionId/places", async (req, res) => {
  const { regionId } = req.params;
  const { name, address, order } = req.body;

  // 필수 필드 검증
  if (!name || !address || typeof order !== "number") {
    return res
      .status(400)
      .json({ error: "장소명, 주소, 순서를 모두 입력해주세요." });
  }

  // 유효한 MongoDB ObjectId인지 확인
  if (!mongoose.Types.ObjectId.isValid(regionId)) {
    return res.status(400).json({ error: "유효하지 않은 지역 ID입니다." });
  }

  try {
    const region = await Region.findById(regionId);
    if (!region) {
      return res.status(404).json({ error: "해당 지역을 찾을 수 없습니다." });
    }

    const newPlace = new Place({ region: regionId, name, address, order });
    await newPlace.save();
    res.status(201).json({
      message: "장소가 성공적으로 등록되었습니다.",
      place: newPlace,
    });
  } catch (err) {
    console.error("장소 등록 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// PUT /places/:id - 특정 장소 수정
apiRouter.put("/places/:id", async (req, res) => {
  const { id } = req.params;
  const { name, address, order } = req.body;

  // 유효한 MongoDB ObjectId인지 확인
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "유효하지 않은 장소 ID입니다." });
  }

  try {
    const place = await Place.findById(id);
    if (!place) {
      return res.status(404).json({ error: "해당 장소를 찾을 수 없습니다." });
    }

    if (name) place.name = name;
    if (address) place.address = address;
    if (typeof order === "number") place.order = order;

    await place.save();
    res.json({
      message: "장소가 성공적으로 수정되었습니다.",
      place,
    });
  } catch (err) {
    console.error("장소 수정 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// DELETE /places/:id - 특정 장소 삭제
apiRouter.delete("/places/:id", async (req, res) => {
  const { id } = req.params;

  // 유효한 MongoDB ObjectId인지 확인
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "유효하지 않은 장소 ID입니다." });
  }

  try {
    const deletedPlace = await Place.findByIdAndDelete(id);
    if (!deletedPlace) {
      return res.status(404).json({ error: "해당 장소를 찾을 수 없습니다." });
    }

    res.json({ message: "장소가 성공적으로 삭제되었습니다." });
  } catch (err) {
    console.error("장소 삭제 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

apiRouter.get("/places/:placeId/parking-spots", async (req, res) => {
  try {
    const place = await Place.findById(req.params.placeId);
    if (!place) {
      return res.status(404).json({ error: "장소를 찾을 수 없습니다." });
    }
    res.json(place.parkingSpot || []);
  } catch (err) {
    console.error("주차 위치 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

apiRouter.put("/places/:placeId/parking-spots", async (req, res) => {
  try {
    const { parkingSpot } = req.body;
    const place = await Place.findById(req.params.placeId);
    if (!place) {
      return res.status(404).json({ error: "장소를 찾을 수 없습니다." });
    }
    place.parkingSpot = parkingSpot;
    await place.save();
    res.json({
      message: "주차 위치 업데이트",
      parkingSpot: place.parkingSpot,
    });
  } catch (err) {
    console.error("주차 위치 업데이트 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// router.get("/car-location-register", (req, res) => {
//   const region = req.query.region;

//   if (!region) {
//     return res.status(400).send("지역 정보가 제공되지 않았습니다.");
//   }

//   res.render("car-location-register", { region });
// });

// 토큰 유효성 검사 엔드포인트
// router.post("/verify-token", (req, res) => {
//   res.json({ valid: true });
// });

apiRouter.get(
  "/reports/weekly",
  authenticateToken,
  authorizeRoles("관리자", "작업자"),
  async (req, res) => {
    try {
      const {
        year,
        month,
        week,
        customer,
        manager,
        team,
        region,
        place,
        parkingSpot,
        carType,
      } = req.query;

      const filter = {};

      if (year && month && week) {
        const startDate = getStartDateOfWeek(year, month, week);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);

        // filter.workDate = { $gte: startDate, $lte: endDate };

        filter.$or = [
          {
            workDate: { $gte: startDate, $lte: endDate },
            status: "complete",
          },
          {
            assignDate: { $gte: startDate, $lte: endDate },
            status: { $ne: "complete" },
          },
        ];
      }

      if (customer) filter.customer = customer;
      if (manager) filter.manager = manager;
      if (team) filter.team = team;
      if (region) filter["location.region"] = region;
      if (place) filter["location.place"] = place;
      if (parkingSpot) filter["location.parkingSpot"] = parkingSpot;
      if (carType) filter.type = carType;

      // 데이터 가져오기
      const records = await CarRegistration.find(filter)
        .populate("type")
        .populate("customer")
        .populate("manager")
        .populate("location.region")
        .populate("location.place")
        .lean();

      const totalCars = records.length;
      const washedCars = records.filter(
        (record) => record.status === "complete"
      ).length;
      const washRate =
        totalCars > 0 ? ((washedCars / totalCars) * 100).toFixed(2) : "0";

      // 응답 데이터 준비
      const responseData = {
        totalWashRate: washRate,
        totalWashCount: washedCars,
        records: records
          .map((record) => ({
            date:
              record.status === "complete"
                ? record.workDate
                  ? record.workDate.toISOString().split("T")[0]
                  : ""
                : record.assignDate
                ? record.assignDate.toISOString().split("T")[0]
                : "",
            licensePlate: record.licensePlate,
            carType: record.type ? record.type.name : "",
            customer: record.customer ? record.customer.name : "",
            region: record.location.region ? record.location.region.name : "",
            place: record.location.place ? record.location.place.name : "",
            manager: record.manager ? record.manager.name : "",
            washStatus: record.status === "complete" ? "세차완료" : "세차전",
          }))
          .sort((a, b) => {
            // 세차상태로 먼저 정렬 (세차전이 앞으로)
            if (a.washStatus !== b.washStatus) {
              return a.washStatus === "세차전" ? -1 : 1;
            }
            // 같은 상태 내에서는 날짜 기준 정렬 (최신순)
            if (a.date && b.date) {
              return new Date(b.date) - new Date(a.date);
            }
            return 0;
          }),
      };

      res.json(responseData);
    } catch (error) {
      console.error("주간 보고서 오류:", error);
      res
        .status(500)
        .json({ error: "주간 보고서 생성 중 오류가 발생했습니다." });
    }
  }
);

// 주차별 시작 날짜를 가져오는 헬퍼 함수
function getStartDateOfWeek(year, month, week) {
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const dayOfWeek = firstDayOfMonth.getDay(); // 0 (일요일)부터 6 (토요일)까지
  const offset = (week - 1) * 7 - dayOfWeek + 1;
  return new Date(year, month - 1, 1 + offset);
}

//월간 보고서
apiRouter.get(
  "/reports/monthly",
  authenticateToken,
  authorizeRoles("관리자", "작업자"),
  async (req, res) => {
    try {
      const {
        year,
        month,
        customer,
        manager,
        team,
        region,
        place,
        parkingSpot,
        carType,
      } = req.query;

      const currentDate = new Date();
      const selectedYear = year || currentDate.getFullYear();
      const selectedMonth = month || currentDate.getMonth() + 1;

      const filter = {};

      // if (year && month) {
      //   const startDate = new Date(year, month - 1, 1);
      //   const endDate = new Date(year, month, 0);
      //   filter.assignDate = { $gte: startDate, $lte: endDate };
      // }
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);
      filter.assignDate = { $gte: startDate, $lte: endDate };

      if (customer) filter.customer = customer;
      if (manager) filter.manager = manager;
      if (team) filter.team = team;
      if (region) filter["location.region"] = region;
      if (place) filter["location.place"] = place;
      if (parkingSpot) filter["location.parkingSpot"] = parkingSpot;
      if (carType) filter.type = carType;

      // 데이터 가져오기
      const allCars = await CarRegistration.find(filter)
        .populate("type")
        .populate("customer")
        .populate("manager")
        .populate("location.region")
        .populate("location.place")
        .lean();

      // const records = allCars.map((car) => ({
      //   date: car.assignDate
      //     ? new Date(car.assignDate).toISOString().split("T")[0]
      //     : "-",
      //   licensePlate: car.licensePlate || "-",
      //   carType: car.type?.name || "N/A",
      //   customer: car.customer?.name || "N/A",
      //   region: car.location?.region?.name || "N/A",
      //   place: car.location?.place?.name || "N/A",
      //   manager: car.manager?.name || "N/A",
      //   washStatus: car.status === "complete" ? "세차완료" : "세차전",
      // }));
      // const monthlyWashFilter = {
      //   ...filter,
      //   workDate: { $gte: startDate, $lte: endDate },
      // };

      // const monthlyWashRecords = await CarRegistration.find(monthlyWashFilter)
      //   .populate("type")
      //   .populate("customer")
      //   .populate("manager")
      //   .populate("location.region")
      //   .populate("location.place")
      //   .lean();

      // 각 주차별로 세차 상태를 확인하고 데이터 가공
      const carDataMap = {};

      allCars.forEach((car) => {
        carDataMap[car.licensePlate] = {
          // date: car.assignDate
          //   ? new Date(car.assignDate).toISOString().split("T")[0]
          //   : "-",
          date:
            car.status === "complete"
              ? car.workDate
                ? new Date(car.workDate).toISOString().split("T")[0]
                : "-"
              : car.assignDate
              ? new Date(car.assignDate).toISOString().split("T")[0]
              : "-",
          licensePlate: car.licensePlate,
          carType: car.type?.name || "N/A",
          customer: car.customer?.name || "N/A",
          region: car.location?.region?.name || "N/A",
          place: car.location?.place?.name || "N/A",
          manager: car.manager?.name || "N/A",
          washStatus: car.status === "complete" ? "세차완료" : "세차전",
          washCount: car.status === "complete" ? 1 : 0,
          assignDate: car.assignDate,
          workDate: car.workDate,
        };
      });

      // monthlyWashRecords.forEach((record) => {
      //   if (carDataMap[record.licensePlate]) {
      //     if (record.status === "complete") {
      //       carDataMap[record.licensePlate].washStatus = "세차완료";
      //       carDataMap[record.licensePlate].washCount = 1;
      //       carDataMap[record.licensePlate].date = record.workDate
      //         ? new Date(record.workDate).toISOString().split("T")[0]
      //         : "-";
      //     }
      //   }
      // });

      // totalWashRateCell.textContent = data.totalWashRate || "0";

      const totalCars = Object.keys(carDataMap).length;
      // const totalWashCount = records.filter(
      //   (record) => record.status === "complete"
      // ).length;
      const totalWashCount = Object.values(carDataMap).reduce(
        (sum, car) => sum + car.washCount,
        0
      );
      const totalWashRate =
        totalCars > 0 ? ((totalWashCount / totalCars) * 100).toFixed(2) : "0";

      const responseData = {
        totalWashCount,
        totalWashRate,
        records: Object.values(carDataMap)
          // .map((car) => ({
          // const washRate = ((car.washCount / 4) * 100).toFixed(2); // 4주 기준 세차율 계산
          // return {
          //   ...car,
          //   washRate,
          // };
          //     ...car,
          //     washRate: ((car.washCount / 4) * 100).toFixed(2),
          //   })),
          // };
          .filter((car) => car.licensePlate)
          .sort((a, b) => {
            // if (a.assignDate && b.assignDate) {
            //   return new Date(b.assignDate) - new Date(a.assignDate);
            // }
            // if (a.assignDate) return -1;
            // if (b.assignDate) return 1;
            if (a.washStatus !== b.washStatus) {
              return a.washStatus === "세차전" ? -1 : 1;
            }

            // 세차전 차량은 배정날짜 기준 정렬
            if (a.washStatus === "세차전") {
              if (a.assignDate && b.assignDate) {
                return new Date(b.assignDate) - new Date(a.assignDate);
              }
            }
            // 세차완료 차량은 작업날짜 기준 정렬
            else {
              if (a.workDate && b.workDate) {
                return new Date(b.workDate) - new Date(a.workDate);
              }
            }

            // 배정날짜가 없는 경우 차량번호로 정렬
            return a.licensePlate.localeCompare(b.licensePlate);
          })
          .map((record) => {
            // assignDate 필드 제거 (클라이언트에게 불필요)
            const { assignDate, workDate, ...rest } = record;
            return rest;
          }),
      };

      res.json(responseData);
    } catch (error) {
      console.error("월간 보고서 오류:", error);
      res
        .status(500)
        .json({ error: "월간 보고서 생성 중 오류가 발생했습니다." });
    }
  }
);

// 해당 날짜의 월 내 주차 계산 함수
function getWeekOfMonth(date) {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfWeek = firstDayOfMonth.getDay();
  const adjustedDate = date.getDate() + dayOfWeek;
  return Math.ceil(adjustedDate / 7);
}

// 엑셀 다운로드 엔드포인트
apiRouter.get(
  "/reports/weekly/excel",
  authenticateToken,
  authorizeRoles("관리자", "작업자"),
  async (req, res) => {
    try {
      const {
        year,
        month,
        week,
        customer,
        manager,
        team,
        region,
        place,
        parkingSpot,
        carType,
      } = req.query;

      const filter = {};

      // if (year && month && week) {
      //   const startDate = getStartDateOfWeek(year, month, week);
      //   const endDate = new Date(startDate);
      //   endDate.setDate(startDate.getDate() + 6);

      //   filter.workDate = { $gte: startDate, $lte: endDate };
      // }
      if (year && month) {
        const startDate = new Date(year, month - 1, 1); // 해당 월의 첫째 날
        const endDate = new Date(year, month, 0); // 해당 월의 마지막 날

        filter.workDate = { $gte: startDate, $lte: endDate };
      }

      if (customer) filter.customer = customer;
      if (manager) filter.manager = manager;
      if (team) filter.team = team;
      if (region) filter["location.region"] = region;
      if (place) filter["location.place"] = place;
      if (parkingSpot) filter["location.parkingSpot"] = parkingSpot;
      if (carType) filter.type = carType;

      // 데이터 가져오기
      const records = await CarRegistration.find(filter)
        .populate("type")
        .populate("customer")
        .populate("manager")
        .populate("location.region")
        .populate("location.place")
        .lean();

      const workbook = XLSX.utils.book_new();
      const worksheetData = [
        [
          "일자",
          "차량 번호",
          "차종",
          "고객사",
          "지역",
          "장소",
          "작업자",
          "세차 상태",
        ],
        ...records.map((record) => [
          // record.date,
          // record.licensePlate,
          // record.carType,
          // record.customer,
          // record.region,
          // record.place,
          // record.manager,
          // record.washStatus,
          record.workDate ? record.workDate.toISOString().split("T")[0] : "",
          record.licensePlate,
          record.type ? record.type.name : "",
          record.customer ? record.customer.name : "",
          record.location.region ? record.location.region.name : "",
          record.location.place ? record.location.place.name : "",
          record.manager ? record.manager.name : "",
          record.status === "complete" ? "완료" : "미완료",
        ]),
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "주간 보고서");

      // 엑셀 파일 버퍼 생성
      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      // 응답 헤더 설정
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="weekly_report.xlsx"'
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      // 파일 전송
      res.send(excelBuffer);
    } catch (error) {
      console.error("엑셀 다운로드 오류:", error);
      res.status(500).json({ error: "엑셀 다운로드 중 오류가 발생했습니다." });
    }
  }
);

apiRouter.get(
  "/reports/monthly/excel",
  authenticateToken,
  authorizeRoles("관리자", "작업자"),
  async (req, res) => {
    try {
      const {
        year,
        month,
        customer,
        manager,
        team,
        region,
        place,
        parkingSpot,
        carType,
      } = req.query;

      const currentDate = new Date();
      const selectedYear = year || currentDate.getFullYear();
      const selectedMonth = month || currentDate.getMonth() + 1;

      const filter = {};

      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);
      filter.assignDate = { $gte: startDate, $lte: endDate };

      if (customer) filter.customer = customer;
      if (manager) filter.manager = manager;
      if (team) filter.team = team;
      if (region) filter["location.region"] = region;
      if (place) filter["location.place"] = place;
      if (parkingSpot) filter["location.parkingSpot"] = parkingSpot;
      if (carType) filter.type = carType;

      // 데이터 가져오기
      const allCars = await CarRegistration.find(filter)
        .populate("type")
        .populate("customer")
        .populate("manager")
        .populate("location.region")
        .populate("location.place")
        .lean();

      // 엑셀 워크북 생성
      const workbook = XLSX.utils.book_new();

      // 헤더 행 정의
      const headers = [
        "일자",
        "차량 번호",
        "차종",
        "고객사",
        "지역",
        "장소",
        "작업자",
        "세차 상태",
      ];

      // 데이터 행 생성
      const excelData = [
        headers,
        ...allCars
          .map((car) => ({
            date:
              car.status === "complete"
                ? car.workDate
                  ? new Date(car.workDate).toISOString().split("T")[0]
                  : "-"
                : car.assignDate
                ? new Date(car.assignDate).toISOString().split("T")[0]
                : "-",
            licensePlate: car.licensePlate || "-",
            carType: car.type?.name || "N/A",
            customer: car.customer?.name || "N/A",
            region: car.location?.region?.name || "N/A",
            place: car.location?.place?.name || "N/A",
            manager: car.manager?.name || "N/A",
            washStatus: car.status === "complete" ? "세차완료" : "세차전",
          }))
          .sort((a, b) => {
            if (a.washStatus !== b.washStatus) {
              return a.washStatus === "세차전" ? -1 : 1;
            }
            return new Date(b.date) - new Date(a.date);
          })
          .map((record) => [
            record.date,
            record.licensePlate,
            record.carType,
            record.customer,
            record.region,
            record.place,
            record.manager,
            record.washStatus,
          ]),
      ];

      // 워크시트 생성
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);

      // 워크북에 워크시트 추가
      XLSX.utils.book_append_sheet(workbook, worksheet, "월간 보고서");

      // 엑셀 파일 버퍼 생성
      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      // 응답 헤더 설정
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="monthly_report_${year}_${month}.xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      // 파일 전송
      res.send(excelBuffer);
    } catch (error) {
      console.error("엑셀 다운로드 오류:", error);
      res.status(500).json({ error: "엑셀 다운로드 중 오류가 발생했습니다." });
    }
  }
);

// 1. 관리자 ID 중복 확인 엔드포인트
apiRouter.get("/accounts/check-duplicate", async (req, res) => {
  const { adminId } = req.query;
  if (!adminId) {
    return res.status(400).json({ error: "관리자 ID가 필요합니다." });
  }
  try {
    const existingAccount = await Account.findOne({
      adminId,
      status: "active",
    });
    if (existingAccount) {
      return res.json({ isDuplicate: true });
    } else {
      return res.json({ isDuplicate: false });
    }
  } catch (err) {
    console.error("관리자 ID 중복 확인 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 2. 계정 등록 엔드포인트
apiRouter.post(
  "/accounts",
  authenticateToken,
  authorizeRoles("관리자"),
  async (req, res) => {
    const { adminId, adminName, password, customer, authorityGroup } = req.body;

    // 필수 필드 검증
    if (!adminId || !adminName || !password || !authorityGroup) {
      // !customer 삭제
      return res.status(400).json({ error: "모든 필드를 입력해주세요." });
    }

    // 관리자 권한이 아닌 경우 고객사 필드 검증
    if (authorityGroup !== "관리자") {
      if (!customer) {
        return res.status(400).json({ error: "고객사를 선택해주세요." });
      }
    }
    try {
      // 관리자 ID 중복 확인
      const existingAccount = await Account.findOne({ adminId });
      if (existingAccount) {
        return res
          .status(400)
          .json({ error: "이미 사용 중인 관리자 ID입니다." });
      }

      // 비밀번호 해싱 (보안 강화)
      const hashedPassword = await bcryptjs.hash(password, 10);

      let managerId = null;
      const existingManager = await Manager.findOne({ name: adminName });
      if (!existingManager) {
        const newManager = new Manager({
          name: adminName,
          // 추가 필드가 필요하다면 여기서 설정
        });
        await newManager.save();
        console.log(`Manager ${adminName} 생성 완료`);
        managerId = newManager._id;
      } else {
        console.warn(`Manager with name ${adminName} already exists`);
        managerId = existingManager._id;
      }
      // 계정 생성
      const newAccount = new Account({
        adminId,
        adminName,
        password: hashedPassword,
        customer: authorityGroup !== "관리자" ? customer : null,
        authorityGroup,
        status: "active",
      });

      if (authorityGroup === "작업자") {
        newAccount.manager = managerId;
      }

      await newAccount.save();

      // Manager 생성
      // let managerId;
      // const existingManager = await Manager.findOne({ name: adminName });
      // if (!existingManager) {
      //   const newManager = new Manager({
      //     name: adminName,
      //   });
      //   await newManager.save();
      //   console.log(`Manager ${adminName} 생성 완료`);
      //   managerId = newManager._id;
      // } else {
      //   console.warn(`Manager with name ${adminName} already exists`);
      //   managerId = existingManager._id;
      // }

      // if (authorityGroup === "작업자") {
      //   newAccount.manager = managerId;
      //   await newAccount.save();
      // }

      res.status(201).json(newAccount);
    } catch (err) {
      console.error("계정 생성 오류:", err);
      res.status(500).json({ error: "서버 오류" });
    }
  }
);

// 관리자 계정 생성 예시
apiRouter.post("/register-admin", async (req, res) => {
  const { adminId, adminName, password, authorityGroup } = req.body;

  if (!adminId || !adminName || !password || !authorityGroup) {
    return res.status(400).json({ error: "모든 필드를 입력해주세요." });
  }
  // 관리자 ID 중복 확인
  const existingAccount = await Account.findOne({ adminId });
  if (existingAccount) {
    return res.status(400).json({ error: "이미 사용 중인 관리자 ID입니다." });
  }

  const hashedPassword = await bcryptjs.hash(password, 10);
  const newAccount = new Account({
    adminId,
    adminName,
    password: hashedPassword,
    authorityGroup,
  });
  await newAccount.save();
  res.json({ message: "관리자 계정이 생성되었습니다." });
});

// 3. 계정 목록 조회 엔드포인트
apiRouter.get(
  "/accounts",
  authenticateToken,
  authorizeRoles("관리자"),
  async (req, res) => {
    const { authorityGroup, adminId, adminName, customerName } = req.query;
    let filter = { status: "active" }; //active만 보이게

    if (authorityGroup) filter.authorityGroup = authorityGroup;
    if (adminId) filter.adminId = adminId;
    if (adminName) filter.adminName = { $regex: adminName, $options: "i" };
    if (customerName) {
      // 고객사명 필터링시 Customer 모델과 조인 필요
      const customers = await Customer.find({
        name: { $regex: customerName, $options: "i" },
      });
      const customerIds = customers.map((c) => c._id);
      filter.customer = { $in: customerIds };
    }

    try {
      const accounts = await Account.find(filter).populate("customer").exec();
      const formattedAccounts = accounts.map((account) => ({
        _id: account._id,
        affiliation: "소속", // 소속구분 추가 정보 필요
        authorityGroup: account.authorityGroup,
        adminId: account.adminId,
        adminName: account.adminName, // 관리자명 필드 필요
        customerName: account.customer ? account.customer.name : "N/A",
      }));
      res.json(formattedAccounts);
    } catch (err) {
      console.error("계정 목록 조회 오류:", err);
      res.status(500).json({ error: "서버 오류" });
    }
  }
);

// 5. 계정 삭제 엔드포인트
apiRouter.delete(
  "/accounts/:id",
  authenticateToken,
  authorizeRoles("관리자"),
  async (req, res) => {
    const { id } = req.params;

    // 유효한 MongoDB ObjectId인지 확인
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "유효하지 않은 계정 ID입니다." });
    }

    try {
      // const deletedAccount = await Account.findByIdAndDelete(id);

      // if (!deletedAccount) {
      //   return res.status(404).json({ error: "해당 계정을 찾을 수 없습니다." });
      // }
      const account = await Account.findById(id);

      if (!account) {
        return res.status(404).json({ error: "해당 계정을 찾을 수 없습니다." });
      }
      //상태 변경
      account.status = "withdrawn";
      account.withdrawalDate = new Date();
      await account.save();

      res.json({ message: "계정이 성공적으로 삭제되었습니다." });
    } catch (err) {
      console.error("계정 삭제 오류:", err);
      res.status(500).json({ error: "서버 오류" });
    }
  }
);

//계정 상세 정보 조회
apiRouter.get(
  "/accounts/:id",
  authenticateToken, // 인증
  authorizeRoles("관리자"), // 권한 부여(관리자만 접근 가능)
  async (req, res) => {
    const { id } = req.params;

    // 유효한 ObjectId인지 확인
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "유효하지 않은 계정 ID입니다." });
    }

    try {
      const account = await Account.findById(id)
        .populate("customer")
        .populate("manager")
        .exec();

      if (!account) {
        return res.status(404).json({ error: "해당 계정을 찾을 수 없습니다." });
      }

      // 필요한 필드만 반환
      const accountData = {
        _id: account._id,
        adminId: account.adminId,
        adminName: account.adminName,
        authorityGroup: account.authorityGroup,
        customer: account.customer ? account.customer.name : null,
        manager: account.manager ? account.manager.name : null,
        // 추가적으로 필요한 필드
      };

      res.json(accountData);
    } catch (err) {
      console.error("계정 상세 조회 오류:", err);
      res.status(500).json({ error: "서버 오류" });
    }
  }
);

// 계정 수정 엔드포인트
apiRouter.put(
  "/accounts/:id",
  authenticateToken,
  authorizeRoles("관리자"),
  async (req, res) => {
    const { id } = req.params;
    const { adminId, adminName, password, customer, authorityGroup } = req.body;

    console.log("계정 수정 요청 데이터:", req.body);
    console.log("요청자 권한:", req.user.authorityGroup);
    // 유효한 MongoDB ObjectId인지 확인
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "유효하지 않은 계정 ID입니다." });
    }

    // 필수 필드 검증
    if (!adminId || !adminName || !customer || !authorityGroup) {
      return res.status(400).json({ error: "필수 필드를 모두 입력해주세요." });
    }

    try {
      // 기존 계정 찾기
      const account = await Account.findById(id);
      if (!account) {
        return res.status(404).json({ error: "해당 계정을 찾을 수 없습니다." });
      }

      // 관리자 ID가 변경되었고, 중복된 ID가 있는지 확인
      if (adminId !== account.adminId) {
        const existingAccount = await Account.findOne({ adminId });
        if (existingAccount) {
          return res
            .status(400)
            .json({ error: "이미 사용 중인 관리자 ID입니다." });
        }
        account.adminId = adminId;
      }

      // 관리자명 업데이트
      account.adminName = adminName;

      // 비밀번호가 변경되었는지 확인하고 해싱
      if (password) {
        if (password.length < 2) {
          return res
            .status(400)
            .json({ error: "비밀번호는 최소 2자 이상이어야 합니다." });
        }
        const hashedPassword = await bcryptjs.hash(password, 10);
        account.password = hashedPassword;
      }

      // 고객사 및 권한 그룹 업데이트
      account.customer = customer;
      account.authorityGroup = authorityGroup;

      // 계정 저장
      await account.save();

      res.json({ message: "계정이 성공적으로 수정되었습니다.", account });
    } catch (err) {
      console.error("계정 수정 오류:", err);
      res.status(500).json({ error: "서버 오류" });
    }
  }
);

// 1. 차종 목록 조회
apiRouter.get(
  "/car-types",
  authenticateToken,
  authorizeRoles("관리자", "작업자"),
  async (req, res) => {
    try {
      const carTypes = await CarType.find();
      res.json(carTypes);
    } catch (err) {
      res.status(500).json({ error: "서버 오류" });
    }
  }
);

// 2. 특정 차종의 차량 모델 목록 조회
apiRouter.get(
  "/car-types/:typeId/models",
  authenticateToken,
  authorizeRoles("관리자", "작업자"),
  async (req, res) => {
    try {
      const { typeId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(typeId)) {
        return res.status(400).json({ error: "유효하지 않은 차종 ID입니다." });
      }
      const carModels = await CarModel.find({ type: typeId }).sort({ name: 1 });
      res.json(carModels);
    } catch (err) {
      res.status(500).json({ error: "서버 오류" });
    }
  }
);

// 3. 새로운 차종 추가
apiRouter.post("/car-types", async (req, res) => {
  try {
    const { name } = req.body;
    const newCarType = new CarType({ name });
    await newCarType.save();
    res.status(201).json(newCarType);
  } catch (err) {
    res.status(400).json({ error: "차종 추가 실패" });
  }
});

// 4. 새로운 차량 모델 추가
apiRouter.post("/car-types/:typeId/models", async (req, res) => {
  try {
    const { typeId } = req.params;
    const { name } = req.body;
    const newCarModel = new CarModel({ type: typeId, name });
    await newCarModel.save();
    res.status(201).json(newCarModel);
  } catch (err) {
    res.status(400).json({ error: "차량 모델 추가 실패" });
  }
});

// 5. 차량 등록
apiRouter.post(
  "/car-registrations",
  authenticateToken,
  authorizeRoles("관리자", "작업자"),
  async (req, res) => {
    try {
      const {
        typeId,
        modelId,
        licensePlate,
        location,
        customerId,
        serviceType,
        serviceAmount,
        serviceAmountType,
        notes,
        workDate,
        status = "pending",
        assignDate,
      } = req.body;

      // 필수 필드 검증
      if (
        !typeId ||
        !modelId ||
        !licensePlate ||
        !customerId ||
        !location ||
        !location.region ||
        !location.place
      ) {
        return res
          .status(400)
          .json({ error: "필수 정보를 모두 입력해주세요." });
      }

      // regionDoc 조회
      const regionDoc = await Region.findById(location.region);
      if (!regionDoc) {
        return res
          .status(400)
          .json({ error: "존재하지 않는 region ID입니다." });
      }

      // placeDoc 조회
      const placeDoc = await Place.findOne({
        _id: location.place,
        region: regionDoc._id,
      });
      if (!placeDoc) {
        return res.status(400).json({ error: "존재하지 않는 place ID입니다." });
      }

      // 차량 번호 중복 확인
      const existingCar = await CarRegistration.findOne({
        licensePlate: licensePlate,
      });
      if (existingCar) {
        return res
          .status(400)
          .json({ error: `차량 번호 중복: ${licensePlate}` });
      }

      const newCarRegistration = new CarRegistration({
        type: typeId,
        model: modelId,
        licensePlate,
        location: {
          region: regionDoc._id,
          place: placeDoc._id,
          parkingSpot: location.parkingSpot || "",
        },
        customer: customerId,
        serviceType: serviceType || null,
        serviceAmountType: serviceAmountType || null,
        serviceAmount: serviceAmount || 0,
        notes: notes || "",
        workDate: workDate ? new Date(workDate) : undefined,
        status: status,
        assignDate: assignDate ? new Date(assignDate) : undefined,
      });

      await newCarRegistration.save();
      res.status(201).json(newCarRegistration);
    } catch (err) {
      res.status(400).json({ error: "차량 등록 실패" });
    }
  }
);

// 6. 차량 목록 조회

// 6-1. 특정 차량 정보 조회
apiRouter.get("/car-registrations/:id", async (req, res) => {
  try {
    const carRegistration = await CarRegistration.findById(req.params.id)
      .populate("type") // CarType 정보 포함
      .populate("model") // CarModel 정보 포함
      .populate("customer") // Customer 정보 포함
      .populate("location.region") // Region 정보 포함
      .populate("location.place") // Place 정보 포함
      .populate("manager")
      .exec();

    if (!carRegistration) {
      return res.status(404).json({ error: "차량을 찾을 수 없습니다." });
    }

    res.json(carRegistration);
  } catch (err) {
    console.error("차량 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 7. 차량 삭제
apiRouter.delete("/car-registrations", async (req, res) => {
  try {
    const { ids } = req.body; // 배열 형태로 전달된 차량 ID들

    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: "유효하지 않은 요청 데이터" });
    }

    await CarRegistration.deleteMany({ _id: { $in: ids } }); //deleteMany: filter와 일치하는 문서를 모두 제거
    res.json({ message: "차량이 성공적으로 삭제되었습니다." });
  } catch (err) {
    console.error("차량 삭제 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 8. 특정 차량 정보 수정
apiRouter.put("/car-registrations/:id", async (req, res) => {
  try {
    const {
      typeId,
      modelId,
      licensePlate,
      location,
      customer,
      manager,
      serviceType,
      serviceAmount,
      serviceAmountType,
      notes,
      workDate,
      status,
    } = req.body;

    // location.region과 location.place의 유효성 검사
    if (location.region && !mongoose.Types.ObjectId.isValid(location.region)) {
      return res.status(400).json({ error: "유효하지 않은 region ID입니다." });
    }
    if (location.place && !mongoose.Types.ObjectId.isValid(location.place)) {
      return res.status(400).json({ error: "유효하지 않은 place ID입니다." });
    }

    // region과 place가 존재하는지 확인
    let updatedLocation = {};
    if (location.region) {
      const regionExists = await Region.findById(location.region);
      if (!regionExists) {
        return res
          .status(400)
          .json({ error: "존재하지 않는 region ID입니다." });
      }
      updatedLocation.region = regionExists._id;
    }

    if (location.place) {
      const placeExists = await Place.findOne({
        _id: location.place,
        region: updatedLocation.region,
      });
      if (!placeExists) {
        return res.status(400).json({ error: "존재하지 않는 place ID입니다." });
      }
      updatedLocation.place = placeExists._id;
    }

    if (location.parkingSpot !== undefined) {
      updatedLocation.parkingSpot = location.parkingSpot;
    }

    // manager 필드 처리
    let managerId = null;
    if (manager && manager.trim() !== "") {
      // manager가 ObjectId인지 확인
      if (mongoose.Types.ObjectId.isValid(manager)) {
        const managerDoc = await Manager.findById(manager);
        if (!managerDoc) {
          return res
            .status(400)
            .json({ error: "존재하지 않는 담당자 ID입니다." });
        }
        managerId = managerDoc._id;
      } else {
        // manager가 이름인 경우
        const managerDoc = await Manager.findOne({ name: manager.trim() });
        if (!managerDoc) {
          return res
            .status(400)
            .json({ error: "존재하지 않는 담당자 이름입니다." });
        }
        managerId = managerDoc._id;
      }
    }

    const updatedData = {
      type: typeId,
      model: modelId,
      licensePlate,
      location: updatedLocation,
      customer,
      manager: managerId,
      serviceType: serviceType || null,
      serviceAmountType: serviceAmountType || null,
      serviceAmount: serviceAmount || 0,
      notes: notes || "",
      workDate: workDate ? new Date(workDate) : undefined,
      status: status || undefined,
    };

    const updatedCar = await CarRegistration.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    )
      .populate("type")
      .populate("model")
      .populate("customer")
      .populate("location.region")
      .populate("location.place")
      .populate("manager")
      .exec();

    if (!updatedCar) {
      return res.status(404).json({ error: "차량을 찾을 수 없습니다." });
    }

    res.json(updatedCar);
  } catch (err) {
    console.error("차량 수정 오류:", err);
    res.status(400).json({ error: "차량 수정에 실패했습니다." });
  }
});

const uploadFields = uploadImages.fields([
  { name: "externalPhoto", maxCount: 1 },
  { name: "internalPhoto", maxCount: 1 },
]);

const region = "us-east-1";
const s3Client = new S3Client({ region });
apiRouter.put(
  "/car-registrations/:id/report",
  authenticateToken,
  // authorizeRoles("작업자", "관리자"),
  uploadFields,
  async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;

    // 유효한 MongoDB ObjectId인지 확인
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "유효하지 않은 차량 ID입니다." });
    }

    try {
      const car = await CarRegistration.findById(id);
      if (!car) {
        return res.status(404).json({ error: "차량을 찾을 수 없습니다." });
      }

      // 작업자의 경우, 자신의 매니저와 배정된 차량인지 확인
      // if (req.user.authorityGroup === "작업자") {
      //   const account = await Account.findById(req.user.id);
      //   if (!account || !account.manager) {
      //     return res.status(403).json({ error: "권한이 없습니다." });
      //   }
      // if (!car.manager || !car.manager.equals(account._id)) {
      //   return res
      //     .status(403)
      //     .json({ error: "이 차량에 대한 권한이 없습니다." });
      // }
      //   filter.manager = account.manager._id;
      // }

      // 세차날짜와 상태 자동 업데이트
      const updateData = {
        workDate: new Date(),
        status: "complete",
        notes: notes || "",
      };
      // 메모 업데이트
      // if (req.body.notes) {
      //   car.notes = req.body.notes;
      // }

      //파일 업로드
      if (req.files) {
        async function uploadToS3(file, folderName) {
          const fileExtension = path.extname(file.originalname);
          const fileName = `${folderName}/${Date.now()}-${Math.round(
            Math.random() * 1e9
          )}${fileExtension}`;

          const params = {
            Bucket: "gemma-sj-bucket", // 생성한 S3 버킷 이름으로 변경
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
          };

          // const data = await s3.upload(params).promise();
          // return data.Location;
          try {
            const command = new PutObjectCommand(params);
            await s3Client.send(command);
            // S3 객체의 URL 생성
            const url = `https://${params.Bucket}.s3.${region}.amazonaws.com/${fileName}`;
            return url;
          } catch (err) {
            console.error("S3 업로드 오류:", err);
            throw err;
          }
        }
        // if (req.files.externalPhoto) {
        //   const externalPhotoFilename = req.files.externalPhoto[0].filename;
        //   updateData.externalPhoto = `/uploads/${externalPhotoFilename}`;
        // }
        // if (req.files.internalPhoto) {
        //   const internalPhotoFilename = req.files.internalPhoto[0].filename;
        //   updateData.internalPhoto = `/uploads/${internalPhotoFilename}`;
        // }
        if (req.files.externalPhoto && req.files.externalPhoto[0]) {
          const file = req.files.externalPhoto[0];
          const externalPhotoUrl = await uploadToS3(file, "externalPhotos");
          updateData.externalPhoto = externalPhotoUrl;
        }

        if (req.files.internalPhoto && req.files.internalPhoto[0]) {
          const file = req.files.internalPhoto[0];
          const internalPhotoUrl = await uploadToS3(file, "internalPhotos");
          updateData.internalPhoto = internalPhotoUrl;
        }
      }
      // 내부세차 사진 업로드
      // if (req.files["internalPhoto"]) {
      //   const internalPhotoPath = req.files["internalPhoto"][0].path;
      //   car.internalPhoto = internalPhotoPath;
      // }

      // await car.save();

      const updatedCar = await CarRegistration.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      ).populate("type model customer location.region location.place");

      if (!updatedCar) {
        return res.status(404).json({ error: "차량 업데이트 실패" });
      }

      res.json({
        message: "세차 내역이 성공적으로 보고되었습니다.",
        car: updatedCar,
      });
    } catch (err) {
      console.error("세차 내역 보고 오류:", err);
      res.status(500).json({ error: "세차 내역 보고에 실패했습니다." });
    }
  }
);

// 배정 변경 엔드포인트
apiRouter.put("/car-registrations/:id/assign", async (req, res) => {
  try {
    const { managerId, teamId, assignDate } = req.body;
    const carId = req.params.id;

    // 차량 존재 여부 확인
    const car = await CarRegistration.findById(carId);
    if (!car) {
      return res.status(404).json({ error: "차량을 찾을 수 없습니다." });
    }

    // managerId 유효성 검사
    if (managerId && !mongoose.Types.ObjectId.isValid(managerId)) {
      return res.status(400).json({ error: "유효하지 않은 담당자 ID입니다." });
    }
    if (teamId && !mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ error: "유효하지 않은 팀 ID입니다." });
    }

    if (managerId) {
      const manager = await Manager.findById(managerId);
      if (!manager) {
        return res.status(400).json({ error: "존재하지 않는 담당자입니다." });
      }
      car.manager = managerId;
    } else {
      car.manager = null; // 담당자 해제
    }

    if (teamId) {
      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(400).json({ error: "존재하지 않는 팀입니다." });
      }
      car.team = teamId;
    } else {
      car.team = null; // 팀 해제
    }

    if (assignDate) {
      const parsedDate = new Date(assignDate);
      if (isNaN(parsedDate)) {
        return res
          .status(400)
          .json({ error: "유효하지 않은 배정 날짜입니다." });
      }
      car.assignDate = parsedDate;
    }

    await car.save();

    res.json({ message: "차량 배정이 성공적으로 변경되었습니다.", car });
  } catch (err) {
    console.error("배정 변경 오류:", err);
    res.status(500).json({ error: "배정 변경 중 오류가 발생했습니다." });
  }
});

// 라우터를 통해 API 엔드포인트 정의
// 고객사 목록 조회
apiRouter.get("/customers", async (req, res) => {
  try {
    const customers = await Customer.find().sort({ name: 1 });
    res.json(customers);
  } catch (err) {
    console.error("고객사 목록 조회 오류:", err);
    res.status(500).json({ error: "고객사 목록 조회에 실패했습니다." });
  }
});

// 담당자 목록 조회
apiRouter.get("/managers", async (req, res) => {
  try {
    const managers = await Manager.find();
    res.json(managers);
  } catch (err) {
    console.error("담당자 목록 조회 오류:", err);
    res.status(500).json({ error: "담당자 목록 조회에 실패했습니다." });
  }
});

// 팀 목록 조회
// apiRouter.get("/teams", async (req, res) => {
//   try {
//     const teams = await Team.find();
//     res.json(teams);
//   } catch (err) {
//     console.error("팀 목록 조회 오류:", err);
//     res.status(500).json({ error: "팀 목록 조회에 실패했습니다." });
//   }
// });
// 차량 배정 엔드포인트
apiRouter.put("/car-registrations/assign", async (req, res) => {
  try {
    const { carIds, managerId, teamId, assignDate } = req.body;

    // 필수 필드 확인
    if (!carIds || !Array.isArray(carIds) || carIds.length === 0) {
      return res
        .status(400)
        .json({ error: "배정할 차량 ID 목록이 필요합니다." });
    }
    if (!managerId) {
      return res.status(400).json({ error: "담당자 ID가 필요합니다." });
    }
    if (!teamId) {
      return res.status(400).json({ error: "팀 ID가 필요합니다." });
    }
    if (!assignDate) {
      return res.status(400).json({ error: "배정 날짜가 필요합니다." });
    }

    // 담당자 및 팀 존재 여부 확인
    const manager = await Manager.findById(managerId);
    if (!manager) {
      return res.status(404).json({ error: "담당자를 찾을 수 없습니다." });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: "팀을 찾을 수 없습니다." });
    }

    // let updatedAssignDate = new Date();
    // if (assignDate) {
    //   updatedAssignDate = new Date(assignDate);
    //   if (isNaN(updatedAssignDate)) {
    //     return res
    //       .status(400)
    //       .json({ error: "유효하지 않은 날짜 형식입니다." });
    //   }
    // }

    // assignDate 유효성 검사
    const formattedAssignDate = new Date(assignDate);
    if (isNaN(formattedAssignDate)) {
      return res.status(400).json({ error: "유효하지 않은 배정 날짜입니다." });
    }

    // 차량 배정 업데이트
    await CarRegistration.updateMany(
      { _id: { $in: carIds } },
      {
        $set: {
          manager: managerId,
          team: teamId,
          assignDate: updatedAssignDate,
        },
      }
    );

    res.json({ message: "차량이 성공적으로 배정되었습니다." });
  } catch (err) {
    console.error("차량 배정 오류:", err);
    res
      .status(500)
      .json({ error: "차량 배정에 실패했습니다.", details: err.message });
  }
});

// 10. 고객사 목록 조회
apiRouter.get("/customers", async (req, res) => {
  console.log("Received GET request for /customers");
  try {
    const customers = await Customer.find().sort({ name: 1 }); //이름순 정렬
    res.json(customers);
  } catch (err) {
    console.error("고객사 목록 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 11. 새로운 고객사 추가
apiRouter.post("/customers", async (req, res) => {
  try {
    const { name, display } = req.body;
    if (!name) {
      return res.status(400).json({ error: "고객사명이 필요합니다." });
    }

    const existingCustomer = await Customer.findOne({ name });
    if (existingCustomer) {
      return res.status(400).json({ error: "이미 존재하는 고객사명입니다." });
    }

    const newCustomer = new Customer({
      name,
      display: display !== undefined ? display : true,
    });

    await newCustomer.save();
    res.status(201).json(newCustomer);
  } catch (err) {
    console.error("고객사 등록 오류:", err);
    res.status(500).json({ error: "고객사 추가 실패" });
  }
});
// 특정 고객사 조회
apiRouter.get("/customers/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: "고객사를 찾을 수 없습니다." });
    }
    res.json(customer);
  } catch (err) {
    console.error("고객사 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 12. 특정 고객사 정보 수정
apiRouter.put("/customers/:id", async (req, res) => {
  try {
    const { name, display } = req.body;
    if (!name) {
      return res.status(400).json({ error: "고객사명을 입력해주세요." });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: "고객사를 찾을 수 없습니다." });
    }

    customer.name = name;
    customer.display = display;

    await customer.save();

    res.json(customer);
  } catch (err) {
    console.error("고객사 수정 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// GET /managers 담당자 목록
apiRouter.get("/managers", async (req, res) => {
  try {
    const managers = await Manager.find(); // Manager 모델을 정의해야 함
    res.json(managers);
  } catch (err) {
    console.error("담당자 목록 조회 오류:", err);
    res
      .status(500)
      .json({ error: "담당자 목록 조회 실패", details: err.message });
  }
});

// GET /teams 팀 목록
apiRouter.get("/teams", async (req, res) => {
  try {
    const teams = await Team.find();
    res.json(teams);
  } catch (err) {
    console.error("팀 목록 조회 오류:", err);
    res.status(500).json({ error: "팀 목록 조회 실패", details: err.message });
  }
});

// POST /car-registrations/assign 차량 배정
apiRouter.post(
  "/car-registrations/assign",
  // authenticateToken,
  // authorizeRoles("관리자"),
  async (req, res) => {
    try {
      const { carIds, managerId, teamId } = req.body;

      if (!carIds || !Array.isArray(carIds) || carIds.length === 0) {
        return res
          .status(400)
          .json({ error: "유효한 차량 ID 목록이 필요합니다." });
      }

      if (!managerId && !teamId) {
        return res
          .status(400)
          .json({ error: "담당자 ID 또는 팀 ID 중 하나가 필요합니다." });
      }

      const manager = await Manager.findById(managerId);
      if (!manager) {
        return res.status(404).json({ error: "담당자를 찾을 수 없습니다." });
      }

      const team = await Team.findById(teamId);
      if (!team) {
        return res.status(404).json({ error: "팀을 찾을 수 없습니다." });
      }

      // 차량 업데이트
      // const updateData = {};
      // if (managerId) updateData.manager = managerId;
      // if (teamId) updateData.team = teamId;

      await CarRegistration.updateMany(
        { _id: { $in: carIds } },
        { $set: { manager: managerId, team: teamId } }
      );

      res.json({ message: "차량이 성공적으로 배정되었습니다." });
    } catch (err) {
      console.error("차량 배정 오류:", err);
      res.status(500).json({ error: "차량 배정 실패", details: err.message });
    }
  }
);

// 권한 그룹 목록 조회
apiRouter.get("/permission-groups", authenticateToken, async (req, res) => {
  try {
    // 예시 권한 그룹 데이터
    const permissionGroups = [
      { id: 1, name: "관리자" },
      { id: 2, name: "작업자" },
    ];
    res.json(permissionGroups);
  } catch (error) {
    console.error("권한 그룹 조회 오류:", error);
    res.status(500).json({ error: "권한 그룹 조회에 실패했습니다." });
  }
});

// 탈퇴 계정 목록 조회
apiRouter.get("/withdrawn-accounts", authenticateToken, async (req, res) => {
  try {
    const {
      permissionGroup,
      adminId,
      adminName,
      customerName,
      page = 1,
      pageSize = 10,
    } = req.query;

    let filter = { status: "withdrawn" }; // 탈퇴 상태인 계정만 조회

    if (permissionGroup) filter.authorityGroup = permissionGroup;
    if (adminId) filter.adminId = { $regex: adminId, $options: "i" };
    if (adminName) filter.adminName = { $regex: adminName, $options: "i" };
    if (customerName) {
      const customer = await Customer.findOne({
        name: { $regex: customerName, $options: "i" },
      });
      if (customer) {
        filter.customer = customer._id;
      }
    }

    // 전체 데이터 수 조회
    const total = await Account.countDocuments(filter);

    // 페이지네이션 적용하여 데이터 조회
    const accounts = await Account.find(filter)
      .populate("customer")
      .select("authorityGroup adminId adminName customer withdrawalDate status")
      .skip((page - 1) * pageSize)
      .limit(parseInt(pageSize))
      .sort({ withdrawalDate: -1 }) // 탈퇴일시 기준 내림차순 정렬
      .lean();

    const formattedAccounts = accounts.map((account) => ({
      id: account._id,
      permissionGroup: account.authorityGroup,
      adminId: account.adminId,
      adminName: account.adminName,
      customerName: account.customer ? account.customer.name : "-",
      withdrawalDate: account.withdrawalDate,
      status: account.status,
    }));

    res.json({
      data: formattedAccounts,
      totalPages: Math.ceil(total / pageSize),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    console.error("탈퇴 계정 목록 조회 오류:", error);
    res.status(500).json({ error: "탈퇴 계정 목록 조회에 실패했습니다." });
  }
});

// 계정 탈퇴 처리
apiRouter.put(
  "/accounts/:id/withdraw",
  authenticateToken,
  authorizeRoles("관리자"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const account = await Account.findById(id);
      if (!account) {
        return res.status(404).json({ error: "계정을 찾을 수 없습니다." });
      }

      // 탈퇴 처리
      account.status = "withdrawn";
      account.withdrawalDate = new Date();
      await account.save();

      res.json({ message: "계정이 성공적으로 탈퇴 처리되었습니다." });
    } catch (error) {
      console.error("계정 탈퇴 처리 오류:", error);
      res.status(500).json({ error: "계정 탈퇴 처리에 실패했습니다." });
    }
  }
);

// 탈퇴 계정 복구
apiRouter.put(
  "/accounts/:id/restore",
  authenticateToken,
  authorizeRoles("관리자"),
  async (req, res) => {
    try {
      const { id } = req.params;

      const account = await Account.findById(id);
      if (!account) {
        return res.status(404).json({ error: "계정을 찾을 수 없습니다." });
      }

      // 복구 처리
      account.status = "active";
      account.withdrawalDate = null;
      await account.save();

      res.json({ message: "계정이 성공적으로 복구되었습니다." });
    } catch (error) {
      console.error("계정 복구 처리 오류:", error);
      res.status(500).json({ error: "계정 복구에 실패했습니다." });
    }
  }
);

// 엑셀 업로드 (차량 대량 등록)
apiRouter.post(
  "/bulk-upload",
  (req, res, next) => {
    console.log("Received upload request");
    uploadExcel.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error("Multer error:", err);
        return res.status(400).json({ error: err.message });
      } else if (err) {
        console.error("Upload error:", err);
        return res.status(400).json({ error: err.message });
      }
      console.log("File upload successful");
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      console.log("No file uploaded");
      return res.status(400).json({ error: "엑셀 파일을 업로드해주세요." });
    }

    console.log("Uploaded file:", req.file);
    console.log("File path:", req.file.path);
    console.log("File MIME type:", req.file.mimetype);

    // 파일 존재 확인
    try {
      await fs.access(req.file.path, fs.constants.R_OK);
      console.log("File exists and is accessible");

      //엑셀 파일 읽기
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);

      console.log("Processed data count:", data.length);
      // 데이터 유효성 검사 및 변환
      const registrations = [];
      // 데이터베이스에 저장
      for (let row of data) {
        // 엑셀의 컬럼명에 맞게 필드 매핑
        const {
          carType, // 차종 이름
          carModel, // 차량 모델 이름
          licensePlate, // 차량 번호
          region, // 지역
          place, // 장소
          parkingSpot, // 주차 위치
          customer, // 고객사
          serviceType, // 서비스 종류
          serviceAmount, // 서비스 금액
          notes, // 기타 메모
        } = row;

        // 필수 필드 확인
        if (
          !carType ||
          !carModel ||
          !licensePlate ||
          // !region ||
          // !place ||
          !customer
        ) {
          return res
            .status(400)
            .json({ error: "필수 정보가 누락되었습니다.", row });
        }

        // 차종 조회 또는 생성
        let carTypeDoc = await CarType.findOne({ name: carType });
        if (!carTypeDoc) {
          carTypeDoc = new CarType({ name: carType });
          await carTypeDoc.save();
        }

        // 차량 모델 조회 또는 생성
        let carModelDoc = await CarModel.findOne({
          name: carModel,
          type: carTypeDoc._id,
        });
        if (!carModelDoc) {
          carModelDoc = new CarModel({ name: carModel, type: carTypeDoc._id });
          await carModelDoc.save();
        }

        // 고객사 조회 또는 생성
        let customerDoc = await Customer.findOne({ name: customer });
        if (!customerDoc) {
          customerDoc = new Customer({ name });
          await customerDoc.save();
        }

        // 차량 번호 중복 확인
        const existingCar = await CarRegistration.findOne({
          licensePlate: licensePlate,
        });
        if (existingCar) {
          return res
            .status(400)
            .json({ error: `차량 번호 중복: ${licensePlate}`, row });
        }

        // 차량 등록 객체 생성
        const regionDoc = await Region.findOne({ name: region });
        if (!regionDoc) {
          return res
            .status(400)
            .json({ error: `존재하지 않는 지역: ${region}`, row });
        }

        const placeDoc = await Place.findOne({
          name: place,
          region: regionDoc._id,
        });
        if (!placeDoc) {
          return res.status(400).json({
            error: `존재하지 않는 장소: ${place} (지역: ${region})`,
            row,
          });
        }
        const registration = {
          type: carTypeDoc._id,
          model: carModelDoc._id,
          licensePlate,
          location: {
            region: regionDoc._id, //ObjectId로 설정
            place: placeDoc._id, //ObjectId로 설정
            parkingSpot,
          },
          customer: customerDoc._id,
          serviceType: serviceType || "",
          serviceAmount: serviceAmount || 0,
          notes: notes || "",
        };

        registrations.push(registration);
      }

      // 엑셀 업로드 차량 등록
      await CarRegistration.insertMany(registrations);

      // 파일 삭제
      await fs.unlink(req.file.path);
      console.log("File deleted:", req.file.path);

      res.json({
        message: `${registrations.length}개의 차량이 성공적으로 등록되었습니다.`,
      });
    } catch (error) {
      console.error("차량 대량 등록 오류:", error);
      res.status(500).json({
        error: "엑셀 파일 처리 중 오류가 발생했습니다.",
        details: error.message,
      });
    }
  }
);

// login.html 라우트 처리
// app.get("/login.html", (req, res) => {
//   res.sendFile(path.join(__dirname, "public", "login.html"));
// });

app.use("/api", apiRouter);
app.use("/uploads", express.static("uploads"));

// 기본 라우트
app.get("/", (req, res) => {
  // res.sendFile(path.join(__dirname, "public", "login.html"));
  res.redirect("/login.html");
});

app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// 인증된 페이지 라우트
app.get(
  "/car-list.html",
  // (req, res, next) => {
  //   if (req.method === "OPTIONS") {
  //     return res.sendStatus(200);
  //   }
  //   next();
  // },
  // authenticateToken,
  // authorizeRoles("관리자"),
  (req, res) => {
    res.sendFile(path.join(__dirname, "public", "pages", "car-list.html"));
  }
);

app.get(
  "/pages/account-manage.html",
  // authenticateToken,
  // authorizeRoles("관리자"),
  (req, res) => {
    res.sendFile(
      path.join(__dirname, "public", "pages", "account-manage.html")
    );
  }
);

app.get(
  "/car-wash-history.html",
  // authenticateToken,
  // authorizeRoles("작업자"),
  (req, res) => {
    res.sendFile(
      path.join(__dirname, "public", "pages", "car-wash-history.html")
    );
  }
);

app.get("/car-location.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "car-location.html"));
});

app.get("/car-location-detail.html", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "pages", "car-location-detail.html")
  );
});

app.get("/car-location-create.html", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "pages", "car-location-create.html")
  );
});

app.get("/car-location-modify.html", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "pages", "car-location-modify.html")
  );
});

app.get("/car-wash-history-admin.html", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "pages", "car-wash-history-admin.html")
  );
});

app.get("/car-wash-create.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "car-wash-create.html"));
});

app.get("/car-wash-modify.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "car-wash-modify.html"));
});

app.get("/account-manage.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "account-manage.html"));
});

app.get("/account-create.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "account-create.html"));
});

app.get("/account-detail.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "account-detail.html"));
});

app.get("/account-withdrawal.html", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "pages", "account-withdrawal.html")
  );
});

app.get("/customer-manage.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "customer-manage.html"));
});

app.get("/customer-create.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "customer-create.html"));
});

app.get("/customer-modify.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "customer-modify.html"));
});

app.get("/car-wash-report-weekly.html", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "pages", "car-wash-report-weekly.html")
  );
});

app.get("/car-wash-report-monthly.html", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "pages", "car-wash-report-monthly.html")
  );
});

app.get("/car-wash-progress-detail.html", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "pages", "car-wash-progress-detail.html")
  );
});

app.get("/car-info-create.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "car-info-create.html"));
});

app.get("/car-info-modify.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "car-info-modify.html"));
});

app.get("/car-allocation.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pages", "car-allocation.html"));
});

app.get("/car-allocation-modify.html", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "pages", "car-allocation-modify.html")
  );
});

// 에러 핸들링 미들웨어 (라우트 정의 후에 추가)
app.use((err, req, res, next) => {
  console.error("서버 에러:", err);
  // if (err instanceof multer.MulterError) {
  //   res.status(400).json({ error: err.message });
  // } else {
  //   res.status(500).json({ error: "서버 내부 오류" });
  // }

  // ECONNABORTED 에러 특별 처리
  // if (err.code === "ECONNABORTED") {
  //   return;
  // }
  // if (req.xhr || req.headers.accept.includes("application/json")) {
  //   res.status(500).json({
  //     error: "Internal Server Error",
  //     message: process.env.NODE_ENV === "development" ? err.message : undefined,
  //   });
  // } else {
  // 일반 웹 요청에 대한 에러 처리
  // 인증 관련 에러 처리
  if (err.name === "UnauthorizedError" || err.status === 401) {
    return res.redirect("/login.html");
  }

  // Multer 에러 처리
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }

  // AJAX 요청에 대한 에러 처리
  if (req.xhr || req.headers.accept.includes("application/json")) {
    return res.status(500).json({
      error: "내부 서버 오류",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
  res.status(500).send("서버 내부 오류가 발생했습니다.");
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
