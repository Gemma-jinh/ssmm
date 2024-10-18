const MENU_LIST = [
  {
    title: "차량",
    initShow: true,
    subMenu: [
      {
        title: "차량 목록",
        url: "./car-list.html",
      },
      {
        title: "세차 내역 (작업자)",
        url: "./car-wash-history.html",
      },
      {
        title: "세차 내역 (관리자)",
        url: "./car-wash-history-admin.html",
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
      },
      {
        title: "세차 월간 보고서",
        url: "./car-wash-report-monthly.html",
        disabled: true,
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
      },
      {
        title: "탈퇴 계정 관리",
        url: "./account-withdrawal.html",
      },
      {
        title: "고객사 관리",
        url: "./customer-manage.html",
      },
    ],
  },
];

const renderSideNav = () => {
  const $sideNav = $("#sideNav");

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
              ${menu.subMenu
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
  $header.replaceWith(`
      <header id="header" class="navbar bg-white fixed-top">
      <div class="container-fluid">
        <button id="toggleNav" class="navbar-toggler" type="button" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
      </div>
    </header>
    `);
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

  $("#closeNav").click(function () {
    $("body").removeClass("nav-open");
  });

  $("#closeSideNav").click(function () {
    $("body").removeClass("nav-open");
  });
});
