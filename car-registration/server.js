const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path"); //경로 관련 모듈 추가
const multer = require("multer");
const XLSX = require("xlsx");
const util = require("util");
const fs = require("fs");

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
      customer,
      serviceType,
      serviceAmount,
      notes,
    } = req.body;

    const newCarRegistration = new CarRegistration({
      type: typeId,
      model: modelId,
      licensePlate,
      location,
      customer,
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
    const customers = await Customer.find().sort({ createdAt: -1 });
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

// 12. 특정 고객사 정보 수정
app.put("/api/customers/:id", async (req, res) => {
  try {
    const { name, display } = req.body;
    const updatedData = {};

    if (name !== undefined) updatedData.name = name;
    if (display !== undefined) updatedData.display = display;

    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    );

    if (!updatedCustomer) {
      return res.status(404).json({ error: "고객사를 찾을 수 없습니다." });
    }

    res.json(updatedCustomer);
  } catch (err) {
    console.error("고객사 수정 오류:", err);
    res.status(400).json({ error: "고객사 수정 실패" });
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

//정적 파일 서빙 설정
// app.use(express.static(path.join(__dirname, "../public")));

// 모든 다른 라우트에 대해 index.html 반환 (SPA의 경우 필요)
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "public", "index.html"));
// });

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
