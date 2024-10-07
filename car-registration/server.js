const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

//환경 변수 설정
const PORT = process.env.PORT || 5500;
const MONGO_URI = "mongodb://localhost:27017/car_registration"; // 로컬 MongoDB 사용

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json());

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
  customer: String,
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
      .exec();
    res.json(carRegistrations);
  } catch (err) {
    console.error("차량 목록 조회 오류:", err);
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

// 서버 시작
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
