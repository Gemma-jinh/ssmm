const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path"); //경로 관련 모듈 추가
const multer = require("multer");
const XLSX = require("xlsx");
const util = require("util");
const fs = require("fs");
const bcrypt = require("bcrypt");
const Region = require("./models/Region");
// const Place = require("./models/Place");

// Promisify fs functions
const mkdir = util.promisify(fs.mkdir);
const stat = util.promisify(fs.stat);
const access = util.promisify(fs.access);
const unlink = util.promisify(fs.unlink);

console.log("Current working directory:", process.cwd());

//환경 변수 설정
// const PORT = process.env.PORT || 3000;
const MONGO_URI = "mongodb://localhost:27017/car_registration"; // 로컬 MongoDB 사용

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());

//정적 파일 서빙 설정
app.use(express.static(path.join(__dirname, "../public")));

// 파일 저장 경로 설정 및 폴더 생성
const uploadDir = path.resolve(__dirname, "uploads");
console.log("Upload directory:", uploadDir);

// 디렉토리 생성 함수
async function ensureDir(dirpath) {
  try {
    await fs.promises.mkdir(dirpath, { recursive: true });
    console.log(`Directory created or already exists: ${dirpath}`);
    // 디렉토리 권한 확인
    const stats = await fs.promises.stat(dirpath);
    console.log(`Directory permissions: ${stats.mode}`);
  } catch (err) {
    console.error(`Error creating/checking directory ${dirpath}:`, err);
    throw err;
  }
}

// 서버 시작 시 업로드 디렉토리 생성 확인
ensureDir(uploadDir).catch((err) => {
  console.error("Failed to create upload directory:", err);
  process.exit(1);
});

// 파일 저장 경로 설정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log(
      "Multer destination function called. Upload directory:",
      uploadDir
    );
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // 파일 이름에서 특수 문자 제거
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "");
    const fileName = uniqueSuffix + "-" + safeName;
    console.log("Generated filename:", fileName);
    cb(null, fileName);
  },
});

// 파일 필터링 (엑셀 파일만 허용)
const fileFilter = (req, file, cb) => {
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

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

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

const CarRegistrationSchema = new mongoose.Schema({
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
    region: String,
    place: String,
    parkingSpot: String,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  serviceType: String,
  serviceAmount: Number,
  notes: String,
  createdAt: { type: Date, default: Date.now },
});

// Account 모델 정의
const accountSchema = new mongoose.Schema({
  adminId: { type: String, required: true, unique: true },
  adminName: { type: String, required: true },
  password: { type: String, required: true },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  authorityGroup: { type: String, required: true },
});

const Account = mongoose.model("Account", accountSchema);

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
});

const Place = mongoose.model("Place", PlaceSchema);

//장소 스키마 정의
// const CarLocationSchema = new mongoose.Schema({
//   region: { type: String, required: true },
//   name: { type: String, required: true },
//   address: { type: String, required: true },
// });

// const CarLocation = mongoose.model("CarLocation", CarLocationSchema);

// 서비스 종류 모델 (models/ServiceType.js)

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
    const serviceTypes = ["주1회", "주2회", "주3회", "주4회", "주5회"];
    for (const name of serviceTypes) {
      const existing = await ServiceType.findOne({ name });
      if (!existing) {
        const serviceType = new ServiceType({ name });
        await serviceType.save();
      }
    }
    console.log("서비스 종류 초기 데이터 삽입 완료");

    // 서비스 금액 타입 초기 데이터
    const amountTypes = ["일할", "단가"];
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

// DB 연결
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB 연결 성공");

    const defaultCarTypes = ["경형", "소형", "중형", "대형", "승합", "기타"];

    // CarType 모델이 정의된 후에 실행되어야 합니다.
    CarType.find()
      .then((existingTypes) => {
        if (existingTypes.length === 0) {
          return CarType.insertMany(defaultCarTypes.map((name) => ({ name })));
        }
      })
      .then(() => {
        console.log("기본 차종이 추가되었습니다.");
      })
      .catch((err) => {
        console.error("기본 차종 추가 오류:", err);
      });
  })
  .catch((err) => console.error("MongoDB 연결 실패:", err));

// API 엔드포인트

app.get("/api/regions/name/:regionName", async (req, res) => {
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

app.get("/api/regions/name/:regionName/places", async (req, res) => {
  const { regionName } = req.params;

  if (!regionName) {
    return res.status(400).json({ error: "지역명이 필요합니다." });
  }

  try {
    const region = await Region.findOne({ name: regionName });
    if (!region) {
      return res.status(404).json({ error: "해당 지역을 찾을 수 없습니다." });
    }

    const places = await Place.find({ region: region._id }).sort({ order: 1 });
    res.json(places);
  } catch (err) {
    console.error("장소 목록 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// POST /api/car-locations 엔드포인트 정의
app.post("/api/car-locations", async (req, res) => {
  try {
    const { region, name, address } = req.body;

    // 필수 필드 검증
    if (!region || !name || !address) {
      return res.status(400).json({ error: "모든 필드를 입력해주세요." });
    }

    // 지역명으로 Region 문서 찾기
    const regionDoc = await Region.findOne({ name: region });
    if (!regionDoc) {
      return res.status(404).json({ error: "해당 지역을 찾을 수 없습니다." });
    }

    // 중복된 장소명 확인 (선택 사항)
    const existingPlace = await Place.findOne({ name, region: regionDoc._id });
    if (existingPlace) {
      return res.status(400).json({ error: "이미 존재하는 장소명입니다." });
    }

    // 새로운 장소 생성
    const newPlace = new Place({
      region: regionDoc._id,
      name,
      address,
    });

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

// POST /api/places 엔드포인트 정의
// app.post("/api/places", async (req, res) => {
//   const { region, name, address } = req.body;

// 유효성 검사
// if (!region || !name || !address) {
//   return res
//     .status(400)
//     .json({ error: "지역, 이름, 주소를 모두 입력해주세요." });
// }

// try {
// 새로운 장소 생성
//     const newCarLocation = new CarLocation({ region, name, address });
//     await newCarLocation.save();

//     res.status(201).json({
//       message: "장소가 성공적으로 등록되었습니다.",
//       place: newCarLocation,
//     });
//   } catch (err) {
//     console.error("장소 등록 오류:", err);
//     res
//       .status(500)
//       .json({ error: "서버 오류로 인해 장소 등록에 실패했습니다." });
//   }
// });

// GET /api/car-locations?region=지역명 엔드포인트 정의
// app.get("/api/car-locations", async (req, res) => {
//   const { region } = req.query;

//   if (!region) {
//     return res.status(400).json({ error: "지역 정보가 제공되지 않았습니다." });
//   }

//   try {
//     const places = await CarLocation.find({ region }).sort({ createdAt: -1 });
//     res.json(places);
//   } catch (err) {
//     console.error("장소 목록 조회 오류:", err);
//     res
//       .status(500)
//       .json({ error: "서버 오류로 인해 장소 목록을 조회할 수 없습니다." });
//   }
// });

// DELETE /api/car-locations/:id 엔드포인트 정의
app.delete("/api/car-locations/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deletedPlace = await CarLocation.findByIdAndDelete(id);
    if (!deletedPlace) {
      return res.status(404).json({ error: "해당 장소를 찾을 수 없습니다." });
    }
    res.json({ message: "장소가 성공적으로 삭제되었습니다." });
  } catch (err) {
    console.error("장소 삭제 오류:", err);
    res
      .status(500)
      .json({ error: "서버 오류로 인해 장소 삭제에 실패했습니다." });
  }
});

// GET /api/regions - 지역 리스트 조회
app.get("/api/regions", async (req, res) => {
  try {
    const regions = await Region.find().sort({ order: 1 });
    res.json(regions);
  } catch (err) {
    console.error("지역 목록 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// POST /api/regions - 새로운 지역 등록
app.post("/api/regions", async (req, res) => {
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
app.get("/api/service-types", async (req, res) => {
  try {
    const serviceTypes = await ServiceType.find().sort({ name: 1 });
    res.json(serviceTypes);
  } catch (err) {
    console.error("서비스 종류 목록 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// app.get("/api/regions/:regionName/places", async (req, res) => {
//   try {
//     const regionName = decodeURIComponent(req.params.regionName);
//     if (!regionName) {
//       return res.status(400).json({ error: "지역명이 필요합니다." });
//     }

// 지역명으로 Region 문서 찾기
//     const region = await Region.findOne({ name: regionName });
//     if (!region) {
//       return res.status(404).json({ error: "해당 지역을 찾을 수 없습니다." });
//     }

//     // Region ObjectId로 Place 문서 찾기
//     const places = await Place.find({ region: region._id }).sort({ name: 1 });
//     res.json(places);
//   } catch (err) {
//     console.error("장소 목록 조회 오류:", err);
//     res.status(500).json({ error: "서버 오류" });
//   }
// });

// 새로운 서비스 종류 추가 (필요한 경우)
app.post("/api/service-types", async (req, res) => {
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
app.get("/api/service-amount-types", async (req, res) => {
  try {
    const amountTypes = await ServiceAmountType.find().sort({ name: 1 });
    res.json(amountTypes);
  } catch (err) {
    console.error("서비스 금액 타입 목록 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 새로운 서비스 금액 타입 추가 (필요한 경우)
app.post("/api/service-amount-types", async (req, res) => {
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

//   try {

//     const savedRegions = await Region.insertMany(uniqueRegions);
//     res.status(201).json({
//       message: "지역이 성공적으로 저장되었습니다.",
//       regions: savedRegions,
//     });
//   } catch (err) {
//     console.error("지역 저장 오류:", err);
//     if (err.code === 11000) {

//       return res.status(400).json({ error: "이미 존재하는 지역 이름입니다." });
//     }
//     res.status(500).json({ error: "서버 오류" });
//   }
// });

// PUT /api/regions/:id - 특정 지역 수정
app.put("/api/regions/:id", async (req, res) => {
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

// DELETE /api/regions/:id - 특정 지역 삭제
app.delete("/api/regions/:id", async (req, res) => {
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

// GET /api/car-locations - 지역별 장소 조회
// app.get("/api/car-locations", async (req, res) => {
//   const { region } = req.query; // URL 쿼리 파라미터에서 region 추출

//   let filter = {};
//   if (region) {
//     filter.region = region;
//   }

//   try {
//     const locations = await CarLocation.find().sort({ order: 1 });
//     res.json(locations);
//   } catch (err) {
//     console.error("지역 조회 오류:", err);
//     res.status(500).json({ error: "서버 오류" });
//   }
// });

// GET /api/regions/:regionId 엔드포인트 정의
app.get("/api/regions/:regionId", async (req, res) => {
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

// GET /api/regions/:regionId/places - 특정 지역의 장소 리스트 조회
app.get("/api/regions/:regionId/places", async (req, res) => {
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

app.delete(
  "/api/regions/name/:regionName/places/:placeId",
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

// DELETE /api/regions/:regionId/places/:placeId 엔드포인트 정의
app.delete("/api/regions/:regionId/places/:placeId", async (req, res) => {
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

app.post("/api/regions/name/:regionName/places", async (req, res) => {
  const { regionName } = req.params;
  const { name, address, order } = req.body;

  if (!name || !address || typeof order !== "number") {
    return res
      .status(400)
      .json({ error: "장소명, 주소, 순서를 모두 입력해주세요." });
  }

  try {
    const region = await Region.findOne({ name: regionName });
    if (!region) {
      return res.status(404).json({ error: "해당 지역을 찾을 수 없습니다." });
    }

    const newPlace = new Place({ region: region._id, name, address, order });
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

// POST /api/regions/:regionId/places - 특정 지역에 새로운 장소 등록
app.post("/api/regions/:regionId/places", async (req, res) => {
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

// PUT /api/places/:id - 특정 장소 수정
app.put("/api/places/:id", async (req, res) => {
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

// DELETE /api/places/:id - 특정 장소 삭제
app.delete("/api/places/:id", async (req, res) => {
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

app.get("/car-location-register", (req, res) => {
  const region = req.query.region;

  if (!region) {
    return res.status(400).send("지역 정보가 제공되지 않았습니다.");
  }

  res.render("car-location-register", { region });
});

// 선택 사항: PUT /api/car-locations/:id - 특정 지역 수정
// app.put("/api/car-locations/:id", async (req, res) => {
//   const { id } = req.params;
//   const { name, order } = req.body;

//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     return res.status(400).json({ error: "유효하지 않은 지역 ID입니다." });
//   }

//   try {
//     const updatedLocation = await CarLocation.findByIdAndUpdate(
//       id,
//       { name, order },
//       { new: true, runValidators: true }
//     );

//     if (!updatedLocation) {
//       return res.status(404).json({ error: "해당 지역을 찾을 수 없습니다." });
//     }

//     res.json({
//       message: "지역이 성공적으로 수정되었습니다.",
//       location: updatedLocation,
//     });
//   } catch (err) {
//     console.error("지역 수정 오류:", err);
//     res.status(500).json({ error: "서버 오류" });
//   }
// });

// POST /api/car-locations 엔드포인트
// app.post("/api/car-locations", async (req, res) => {
//   try {
//     const { region, name, address } = req.body;
//     if (!region || !name || !address) {
//       return res.status(400).json({ error: "모든 필드를 입력해주세요." });
//     }

//     // 새로운 장소 생성
//     const newLocation = new CarLocation({ region, name, address, order: 0 }); // order는 필요 시 조정
//     await newLocation.save();

//     res.status(201).json({
//       message: "장소가 성공적으로 등록되었습니다.",
//       location: newLocation,
//     });
//   } catch (err) {
//     console.error("장소 등록 오류:", err);
//     res.status(500).json({ error: "서버 오류" });
//   }
// });

// 1. 관리자 ID 중복 확인 엔드포인트
app.get("/api/accounts/check-duplicate", async (req, res) => {
  const { adminId } = req.query;
  if (!adminId) {
    return res.status(400).json({ error: "관리자 ID가 필요합니다." });
  }
  try {
    const existingAccount = await Account.findOne({ adminId });
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
app.post("/api/accounts", async (req, res) => {
  const { adminId, adminName, password, customer, authorityGroup } = req.body;

  // 필수 필드 검증
  if (!adminId || !adminName || !password || !customer || !authorityGroup) {
    return res.status(400).json({ error: "모든 필드를 입력해주세요." });
  }

  try {
    // 관리자 ID 중복 확인
    const existingAccount = await Account.findOne({ adminId });
    if (existingAccount) {
      return res.status(400).json({ error: "이미 사용 중인 관리자 ID입니다." });
    }

    // 비밀번호 해싱 (보안 강화)
    const hashedPassword = await bcrypt.hash(password, 10);

    // 계정 생성
    const newAccount = new Account({
      adminId,
      adminName,
      password: hashedPassword,
      customer,
      authorityGroup,
    });

    await newAccount.save();

    res.status(201).json(newAccount);
  } catch (err) {
    console.error("계정 생성 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 3. 계정 목록 조회 엔드포인트
app.get("/api/accounts", async (req, res) => {
  const { authorityGroup, adminId, adminName, customerName } = req.query;
  let filter = {};

  if (authorityGroup) filter.authorityGroup = authorityGroup;
  if (adminId) filter.adminId = adminId;
  if (adminName) filter.adminName = { $regex: adminName, $options: "i" };
  if (customerName) {
    // 고객사명으로 필터링하려면 Customer 모델과 조인 필요
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
      affiliation: "소속", // 소속구분에 대한 추가 정보가 필요함
      authorityGroup: account.authorityGroup,
      adminId: account.adminId,
      adminName: account.adminName, // 관리자명에 대한 필드가 필요함
      customerName: account.customer ? account.customer.name : "N/A",
    }));
    res.json(formattedAccounts);
  } catch (err) {
    console.error("계정 목록 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 4. 계정 상세 정보 조회 엔드포인트
app.get("/api/accounts/:id", async (req, res) => {
  const { id } = req.params;

  // 유효한 MongoDB ObjectId인지 확인
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "유효하지 않은 계정 ID입니다." });
  }

  try {
    const account = await Account.findById(id).populate("customer").exec();

    if (!account) {
      return res.status(404).json({ error: "해당 계정을 찾을 수 없습니다." });
    }

    // 필요한 필드만 선택하여 응답
    const accountDetails = {
      _id: account._id,
      adminId: account.adminId,
      adminName: account.adminName,
      authorityGroup: account.authorityGroup,
      customerName: account.customer ? account.customer.name : "N/A",
      // 추가적인 필드가 있다면 여기에 추가
    };

    res.json(accountDetails);
  } catch (err) {
    console.error("계정 상세 정보 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 5. 계정 삭제 엔드포인트
app.delete("/api/accounts/:id", async (req, res) => {
  const { id } = req.params;

  // 유효한 MongoDB ObjectId인지 확인
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "유효하지 않은 계정 ID입니다." });
  }

  try {
    const deletedAccount = await Account.findByIdAndDelete(id);

    if (!deletedAccount) {
      return res.status(404).json({ error: "해당 계정을 찾을 수 없습니다." });
    }

    res.json({ message: "계정이 성공적으로 삭제되었습니다." });
  } catch (err) {
    console.error("계정 삭제 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 계정 수정 엔드포인트
app.put("/api/accounts/:id", async (req, res) => {
  const { id } = req.params;
  const { adminId, adminName, password, customer, authorityGroup } = req.body;

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
      const hashedPassword = await bcrypt.hash(password, 10);
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
});

// 1. 차종 목록 조회
app.get("/api/car-types", async (req, res) => {
  try {
    const carTypes = await CarType.find();
    res.json(carTypes);
  } catch (err) {
    res.status(500).json({ error: "서버 오류" });
  }
});

// 2. 특정 차종의 차량 모델 목록 조회
app.get("/api/car-types/:typeId/models", async (req, res) => {
  try {
    const { typeId } = req.params;
    const carModels = await CarModel.find({ type: typeId });
    res.json(carModels);
  } catch (err) {
    res.status(500).json({ error: "서버 오류" });
  }
});

// 3. 새로운 차종 추가
app.post("/api/car-types", async (req, res) => {
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
app.post("/api/car-types/:typeId/models", async (req, res) => {
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
app.post("/api/car-registrations", async (req, res) => {
  try {
    const {
      typeId,
      modelId,
      licensePlate,
      location,
      customerId,
      serviceType,
      serviceAmount,
      notes,
    } = req.body;

    // 필수 필드 검증
    if (!typeId || !modelId || !licensePlate || !customerId) {
      return res.status(400).json({ error: "필수 정보를 모두 입력해주세요." });
    }

    const newCarRegistration = new CarRegistration({
      type: typeId,
      model: modelId,
      licensePlate,
      location,
      customer: customerId,
      serviceType,
      serviceAmount,
      notes,
    });

    await newCarRegistration.save();
    res.status(201).json(newCarRegistration);
  } catch (err) {
    res.status(400).json({ error: "차량 등록 실패" });
  }
});

// 6. 차량 목록 조회
app.get("/api/car-registrations", async (req, res) => {
  try {
    const carRegistrations = await CarRegistration.find()
      .populate("type") // CarType 정보 포함
      .populate("model") // CarModel 정보 포함
      .populate("customer") // Customer 정보 포함
      .exec();
    res.json(carRegistrations);
  } catch (err) {
    console.error("차량 목록 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 6-1. 특정 차량 정보 조회
app.get("/api/car-registrations/:id", async (req, res) => {
  try {
    const carRegistration = await CarRegistration.findById(req.params.id)
      .populate("type") // CarType 정보 포함
      .populate("model") // CarModel 정보 포함
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
app.delete("/api/car-registrations", async (req, res) => {
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
app.put("/api/car-registrations/:id", async (req, res) => {
  try {
    const {
      typeId,
      modelId,
      licensePlate,
      location,
      customer,
      serviceType,
      serviceAmount,
      notes,
    } = req.body;

    const updatedData = {
      type: typeId,
      model: modelId,
      licensePlate,
      location,
      customer,
      serviceType,
      serviceAmount,
      notes,
    };

    const updatedCar = await CarRegistration.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    )
      .populate("type")
      .populate("model")
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

// 10. 고객사 목록 조회
app.get("/api/customers", async (req, res) => {
  console.log("Received GET request for /api/customers");
  try {
    const customers = await Customer.find().sort({ name: 1 }); //이름순 정렬
    res.json(customers);
  } catch (err) {
    console.error("고객사 목록 조회 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// 11. 새로운 고객사 추가
app.post("/api/customers", async (req, res) => {
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
app.get("/api/customers/:id", async (req, res) => {
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
app.put("/api/customers/:id", async (req, res) => {
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

// 9. 검색 API 엔드포인트
// app.get("/api/car-registrations", (req, res) => {
//   let filteredCars = cars;

//   const {
//     carType,
//     carModel,
//     carNumber,
//     region,
//     location,
//     parkingLocation,
//     customer,
//     manager,
//   } = req.query;

//   if (carType) {
//     filteredCars = filteredCars.filter((car) => car.carType === carType);
//   }
//   if (carModel) {
//     filteredCars = filteredCars.filter((car) => car.model.name === carModel);
//   }
//   if (carNumber) {
//     filteredCars = filteredCars.filter((car) =>
//       car.licensePlate.includes(carNumber)
//     );
//   }
//   if (region) {
//     filteredCars = filteredCars.filter((car) => car.location.region === region);
//   }
//   if (location) {
//     filteredCars = filteredCars.filter(
//       (car) => car.location.place === location
//     );
//   }
//   if (parkingLocation) {
//     filteredCars = filteredCars.filter(
//       (car) => car.parkingLocation === parkingLocation
//     );
//   }
// 주차 위치와 같은 다른 필드도 추가 가능
//   if (customer) {
//     filteredCars = filteredCars.filter((car) => car.customer === customer);
//   }
//   if (manager) {
//     filteredCars = filteredCars.filter((car) => car.manager.includes(manager));
//   }

//   res.json(filteredCars);
// });

// 엑셀 업로드 (차량 대량 등록)
app.post(
  "/api/car-registrations/bulk-upload",
  (req, res, next) => {
    console.log("Received upload request");
    upload.single("file")(req, res, (err) => {
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
      await access(req.file.path, fs.constants.R_OK);
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
        const registration = {
          type: carTypeDoc._id,
          model: carModelDoc._id,
          licensePlate,
          location: {
            region,
            place,
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
      await unlink(req.file.path);
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

// 에러 핸들링 미들웨어 (라우트 정의 후에 추가)
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.message });
  } else {
    res.status(500).json({ error: "서버 내부 오류" });
  }
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
