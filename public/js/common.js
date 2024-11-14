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

const pagePermissions = {
  "/car-list.html": ["관리자"],
};

function checkAuth() {
  const token = localStorage.getItem("token");
  const currentPath = window.location.pathname;

  console.log("Current Path:", currentPath);

  // 로그인 페이지는 체크 제외
  // if (currentPath === "/login.html") {
  //   return true;
  // }
  const loginPagePattern = /^\/(login|index)(\.html)?$/;
  if (loginPagePattern.test(currentPath)) {
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
  // if (currentPath === "/car-list.html" && payload.authorityGroup !== "관리자") {
  //   window.location.href = "/car-wash-history.html";
  //   return false;
  // }

  // if (
  //   currentPath === "/car-wash-history.html" &&
  //   payload.authorityGroup !== "작업자"
  // ) {
  //   window.location.href = "/car-list.html";
  //   return false;
  // }
  const allowedRoles = pagePermissions[currentPath];
  if (allowedRoles && !allowedRoles.includes(payload.authorityGroup)) {
    alert("접근 권한이 없습니다.");
    // window.history.back();
    // if (payload.authorityGroup === "관리자") {
    //   window.location.href = "/car-list.html";
    // } else if (payload.authorityGroup === "작업자") {
    //   window.location.href = "/car-wash-history.html";
    // } else {
    //   window.location.href = "/login.html";
    // }
    localStorage.removeItem("token");
    window.location.href = "/login.html";
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
      alert("로그인이 필요합니다.");
      localStorage.removeItem("token");
      window.location.href = "/login.html";
    } else if (xhr.status === 403) {
      alert("접근 권한이 없습니다.");
    } else {
      console.error("AJAX 요청 오류:", xhr);
      alert("요청 처리 중 오류가 발생했습니다.");
    }
  },
});

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login.html";
}
