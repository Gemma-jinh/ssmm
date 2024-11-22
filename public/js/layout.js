const MENU_LIST = [
  {
    title: "차량",
    initShow: true,
    subMenu: [
      {
        title: "차량 목록",
        url: "./car-list.html",
        roles: ["관리자"],
      },
      {
        title: "세차 내역 (작업자)",
        url: "./car-wash-history.html",
        roles: ["관리자", "작업자"],
      },
      {
        title: "세차 내역 (관리자)",
        url: "./car-wash-history-admin.html",
        roles: ["관리자"],
      },
    ],
  },
  {
    title: "인프라",
    initShow: true,
    subMenu: [
      {
        title: "작업 장소 관리",
        url: "./car-location.html",
        roles: ["관리자"],
      },
    ],
  },
  {
    title: "통계",
    initShow: true,
    subMenu: [
      {
        title: "세차 주간 보고서",
        url: "./car-wash-report-weekly.html",
        disabled: true,
        roles: ["관리자"],
      },
      {
        title: "세차 월간 보고서",
        url: "./car-wash-report-monthly.html",
        disabled: true,
        roles: ["관리자"],
      },
    ],
  },
  {
    title: "계정",
    initShow: true,
    subMenu: [
      {
        title: "계정 관리",
        url: "./account-manage.html",
        roles: ["관리자"],
      },
      {
        title: "탈퇴 계정 관리",
        url: "./account-withdrawal.html",
        roles: ["관리자"],
      },
      {
        title: "고객사 관리",
        url: "./customer-manage.html",
        roles: ["관리자"],
      },
    ],
  },
];

const layoutLogout = () => {
  // 로그아웃 시 필요한 작업 수행
  sessionStorage.removeItem("token"); // 토큰 제거

  // 기타 로그인 관련 데이터가 있다면 제거
  // localStorage.removeItem("userData"); 등

  // 로그인 페이지로 리다이렉트
  window.location.href = "/login.html";
};

const renderSideNav = () => {
  const $sideNav = $("#sideNav");

  // JWT 토큰에서 사용자 역할 추출
  const token = sessionStorage.getItem("token"); // 로그인 시 저장한 토큰 키 확인
  const payload = parseJwt(token);
  const userRole = payload ? payload.authorityGroup : null;

  let menuHtml = `
    <a href="#" class="nav-logo"><div class="logo fs-3">SSMM.씀</div></a>
    <button id="closeSideNav">
      <img src="../images/icon/x-icon.svg" width="24" height="24" />
    </button>
    <div class="p-3">
      <div class="accordion">
  `;

  MENU_LIST.forEach((menu, index) => {
    const collapseId = `collapse${index}`;
    const visibleSubMenus = menu.subMenu.filter((subItem) =>
      subItem.roles.includes(userRole)
    );

    // 역할에 맞는 서브 메뉴가 없으면 해당 메뉴는 표시하지 않음
    if (visibleSubMenus.length === 0) return;

    menuHtml += `
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button class="accordion-button ${
            menu.initShow ? "" : "collapsed"
          }" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${
      menu.initShow
    }" aria-controls="${collapseId}">${menu.title}</button>
        </h2>
        <div id="${collapseId}" class="accordion-collapse collapse ${
      menu.initShow ? "show" : ""
    }">
          <div class="accordion-body">
            <ul class="list-unstyled">
              ${visibleSubMenus
                .map(
                  (subItem) => `
                <li><a href="${subItem.url}" class="text-white ${
                    subItem.disabled ? "disabled" : ""
                  }">${subItem.title}</a></li>
              `
                )
                .join("")}
            </ul>
          </div>
        </div>
      </div>
    `;
  });

  menuHtml += `
      </div>
    </div>
  `;

  $sideNav.html(menuHtml);
};

const renderHeader = () => {
  const $header = $("#header");
  const token = sessionStorage.getItem("token");
  const payload = parseJwt(token);
  const userRole = payload ? payload.authorityGroup : null;

  // 로그아웃 버튼 HTML
  const logoutButtonHtml = `
    <div class="d-flex justify-content-end align-items-center">
      <button id="logoutButton" class="btn btn-outline-primary btn-lg">로그아웃</button>
    </div>
  `;

  $header.replaceWith(`
      <header id="header" class="navbar bg-white fixed-top">
      <div class="container-fluid">
        <button id="toggleNav" class="navbar-toggler" type="button" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
         ${token ? logoutButtonHtml : ""}
      </div>
    </header>
    `);

  // 로그아웃 버튼 이벤트 핸들러 추가
  if (token) {
    $("#logoutButton").click(function () {
      layoutLogout();
    });
  }
};

function detectMobileDevice() {
  const minWidth = 768;
  return window.innerWidth <= minWidth;
}

$(document).ready(function () {
  // $("body").removeClass("nav-open");

  renderSideNav();
  renderHeader();
  // $("body").removeClass("nav-open");

  // init load
  const isMobile = detectMobileDevice();
  if (!isMobile) {
    // animation stop
    $("body").addClass("nav-open no-transition");

    // 트랜지션을 다시 활성화하기 위해 약간의 지연 후 클래스 제거
    setTimeout(() => {
      $("body").removeClass("no-transition");
    }, 50);
  }

  $("#toggleNav").click(function () {
    $("body").toggleClass("nav-open");
  });

  // $("#closeNav").click(function () {
  //   $("body").removeClass("nav-open");
  // });

  $("#closeNav, #closeSideNav").click(function () {
    $("body").removeClass("nav-open");
  });
});
