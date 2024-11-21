function getCarIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id");
}

// 인증 토큰 가져오기
function getAuthToken() {
  return localStorage.getItem("token");
}

// 날짜 포맷팅 함수
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return `${date.getFullYear()}-${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}

// 차량 세차 내역 로드
async function loadCarWashDetail() {
  try {
    const carId = getCarIdFromUrl();
    if (!carId) {
      alert("차량 정보를 찾을 수 없습니다.");
      window.location.href = "/car-wash-history.html";
      return;
    }

    const token = getAuthToken();
    if (!token) {
      alert("로그인이 필요합니다.");
      window.location.href = "/login.html";
      return;
    }

    const response = await fetch(`/api/car-registrations/${carId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("차량 정보를 불러오는데 실패했습니다.");
    }

    const carData = await response.json();
    displayCarWashDetail(carData);
  } catch (error) {
    console.error("Error:", error);
    alert("차량 세차 내역을 불러오는데 실패했습니다.");
  }
}

// 차량 세차 내역 표시
function displayCarWashDetail(carData) {
  // 차량 번호 표시
  document.querySelector(
    ".content-container:nth-child(1) .content-list div"
  ).textContent = carData.licensePlate || "N/A";

  // 고객사 표시
  document.querySelector(
    ".content-container:nth-child(2) .content-list div"
  ).textContent = carData.customer?.name || "N/A";

  // 외부 세차 사진 표시
  const externalPhotoContainer = document.querySelector(
    ".content-container:nth-child(3) .content-list"
  );
  if (carData.externalPhoto) {
    externalPhotoContainer.innerHTML = `
        <div>
          <img src="${carData.externalPhoto}" alt="외부 세차 사진" style="max-width: 200px; height: auto;" />
        </div>
      `;
  } else {
    externalPhotoContainer.innerHTML = "<div>등록된 사진이 없습니다.</div>";
  }

  // 내부 세차 사진 표시
  const internalPhotoContainer = document.querySelector(
    ".content-container:nth-child(4) .content-list"
  );
  if (carData.internalPhoto) {
    internalPhotoContainer.innerHTML = `
        <div>
          <img src="${carData.internalPhoto}" alt="내부 세차 사진" style="max-width: 200px; height: auto;" />
        </div>
      `;
  } else {
    internalPhotoContainer.innerHTML = "<div>등록된 사진이 없습니다.</div>";
  }

  // 수정하기 버튼에 차량 ID 추가
  const modifyButton = document.querySelector(
    'a[href="./car-wash-modify.html"]'
  );
  modifyButton.href = `./car-wash-modify.html?id=${carData._id}`;
}

// 페이지 로드 시 실행
document.addEventListener("DOMContentLoaded", () => {
  loadCarWashDetail();
});

// 이미지 클릭 시 원본 크기로 보기
document.addEventListener("click", (e) => {
  if (e.target.tagName === "IMG") {
    window.open(e.target.src, "_blank");
  }
});
