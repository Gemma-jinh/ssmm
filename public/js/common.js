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

// $(document).ready(function () {
//   // JWT 토큰 가져오기
//   const token = localStorage.getItem("token");

//   if (!token) {
//     window.location.href = "/login.html";
//     return;
//   }

//   try {
//     const decoded = jwt_decode(token);
//     const currentTime = Date.now() / 1000;

//     if (decoded.exp < currentTime) {
//       alert("세션이 만료되었습니다. 다시 로그인해주세요.");
//       localStorage.removeItem("token");
//       window.location.href = "/login.html";
//       return;
//     }
//   } catch (e) {
//     console.error("토큰 디코딩 오류:", e);
//     localStorage.removeItem("token");
//     window.location.href = "/login.html";
//     return;
//   }

//   $.ajax({
//     url: "/api/verify-token",
//     method: "POST",
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//     success: function (response) {

//     },
//     error: function (xhr, status, error) {

//       alert("세션이 만료되었습니다. 다시 로그인해주세요.");
//       localStorage.removeItem("token");
//       window.location.href = "/login.html";
//     },
//   });
// });

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

// function getUserRole() {
//   const token = localStorage.getItem("token");
//   if (token) {
//     const payload = parseJwt(token);
//     return payload ? payload.authorityGroup : null;
//   }
//   return null;
// }

// function getUserId() {
//   const token = localStorage.getItem("token");
//   if (token) {
//     const payload = parseJwt(token);
//     return payload ? payload.id : null;
//   }
//   return null;
// }

// function logout() {
//   localStorage.clear();
//   window.location.href = "/login.html";
// }

// async function checkAuthentication(requiredRole = null) {
//   if (window.location.pathname === "/login.html") {
//     return true;
//   }

//   const token = localStorage.getItem("token");
//   if (!token) {
//     redirectToLogin();
//     return false;
//   }

//   const payload = parseJwt(token);
//   if (!payload) {
//     alert("유효하지 않은 토큰입니다.");
//     return false;
//   }

//   const currentTime = Date.now() / 1000;
//   if (payload.exp < currentTime) {
//     redirectToLogin("세션이 만료되었습니다.");
//     return false;
//   }

//   try {
//     const response = await $.ajax({
//       url: "/api/verify-token",
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//       contentType: "application/json",
//     });

//     if (!response.success) {
//       redirectToLogin("토큰이 유효하지 않습니다.");
//       return false;
//     }

//     if (requiredRole && payload.authorityGroup !== requiredRole) {
//       alert(" 접근 권한이 없습니다.");
//       window.history.back();
//       return false;
//     }

//     return true;
//   } catch (error) {
//     console.error("Token verification error:", error);
//     redirectToLogin("인증에 실패했습니다.");
//     return false;
//   }
// }

// function redirectToLogin(message = null) {
//   if (message) {
//     alert(message);
//   }
//   localStorage.clear();
//   window.location.href = "/login.html";
// }

function checkAuth() {
  const token = localStorage.getItem("token");
  const currentPath = window.location.pathname;

  // 로그인 페이지는 체크 제외
  if (currentPath === "/login.html") {
    return true;
  }

  if (!token) {
    window.location.href = "/login.html";
    return false;
  }

  const payload = parseJwt(token);
  if (!payload) {
    window.location.href = "/login.html";
    return false;
  }

  // 토큰 만료 체크
  const currentTime = Date.now() / 1000;
  if (payload.exp < currentTime) {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
    return false;
  }

  // 페이지별 권한 체크
  if (currentPath === "/car-list.html" && payload.authorityGroup !== "관리자") {
    window.location.href = "/car-wash-history.html";
    return false;
  }

  if (
    currentPath === "/car-wash-history.html" &&
    payload.authorityGroup !== "작업자"
  ) {
    window.location.href = "/car-list.html";
    return false;
  }

  return true;
}

// 페이지 로드 시 인증 체크 (로그인 페이지 제외)
$(document).ready(function () {
  // let requiredRole = null;
  // if (window.location.pathname.includes("car-list.html")) {
  //   requiredRole = "관리자";
  // } else if (window.location.pathname.includes("car-wash-history.html")) {
  //   requiredRole = "작업자";
  // }

  // if (window.location.pathname !== "/login.html") {
  //   checkAuthentication();
  // }
  checkAuth();
});

// API 요청 시 사용할 공통 설정
$.ajaxSetup({
  beforeSend: function (xhr) {
    const token = localStorage.getItem("token");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
  },
  error: function (xhr) {
    if (xhr.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login.html";
    }
  },
});
