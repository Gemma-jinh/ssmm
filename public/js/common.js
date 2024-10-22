// 예시: 페이징 처리 함수

// function setupPagination(totalPages) {
//   let paginationHtml = "";

//   for (let i = 1; i <= totalPages; i++) {
//     paginationHtml += `
//       <li class="page-item"><a class="page-link" href="#">${i}</a></li>
//     `;
//   }

// 이전, 다음 버튼 추가

//   paginationHtml = `
//     <li class="page-item">
//       <a class="page-link" href="#" aria-label="Previous">
//         <span aria-hidden="true">&laquo;</span>
//       </a>
//     </li>
//     ${paginationHtml}
//     <li class="page-item">
//       <a class="page-link" href="#" aria-label="Next">
//         <span aria-hidden="true">&raquo;</span>
//       </a>
//     </li>
//   `;

//   $(".pagination").html(paginationHtml);
// }

$(document).ready(function () {
  // JWT 토큰 가져오기
  const token = localStorage.getItem("token");

  // 토큰이 없으면 로그인 페이지로 리디렉션
  if (!token) {
    window.location.href = "/login.html"; // 로그인 페이지 경로로 수정
    return;
  }

  // 토큰이 있는 경우, 유효성 검사 (선택 사항)
  $.ajax({
    url: "/api/verify-token", // 토큰 유효성 검사 엔드포인트 (추가 필요)
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    success: function (response) {
      // 토큰이 유효한 경우 아무 작업도 하지 않음
    },
    error: function (xhr, status, error) {
      // 토큰이 유효하지 않거나 만료된 경우 로그인 페이지로 리디렉션
      window.location.href = "/login.html"; // 로그인 페이지 경로로 수정
    },
  });
});

// JWT 디코딩 함수
function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// 사용자 역할 가져오기
function getUserRole() {
  const token = localStorage.getItem("token");
  if (token) {
    const payload = parseJwt(token);
    return payload ? payload.authorityGroup : null;
  }
  return null;
}

// 사용자 ID 가져오기
function getUserId() {
  const token = localStorage.getItem("token");
  if (token) {
    const payload = parseJwt(token);
    return payload ? payload.id : null;
  }
  return null;
}

// 인증 확인 및 리디렉션
function checkAuthentication(requiredRole = null) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("로그인이 필요합니다.");
    window.location.href = "login.html";
    return false;
  }

  const payload = parseJwt(token);
  if (!payload) {
    alert("유효하지 않은 토큰입니다.");
    window.location.href = "login.html";
    return false;
  }

  const role = payload.authorityGroup;
  if (requiredRole && role !== requiredRole) {
    alert("해당 페이지에 접근할 권한이 없습니다.");
    window.location.href = "login.html";
    return false;
  }

  return true;
}

// 로그아웃 함수
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}
