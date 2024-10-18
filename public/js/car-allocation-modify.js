const API_BASE_URL = "/api"; // 백엔드 서버 URL

$(document).ready(function () {
  const carId = getQueryParam("id");
  if (!carId) {
    alert("차량 ID가 없습니다.");
    window.location.href = "./car-allocation.html"; // 차량 배정 페이지로 이동
    return;
  }

  loadManagers();
  loadTeams();
  loadCarInfo(carId);

  // 배정 변경 완료 버튼 클릭 이벤트 핸들러
  $("#change-assign-button").on("click", function () {
    const managerId = $("#change-assign-manager").val();
    const teamId = $("#change-assign-team").val();

    if (!managerId && !teamId) {
      alert("담당자 또는 팀을 선택해주세요.");
      return;
    }

    // 배정 변경 요청 보내기
    changeAssignment(carId, managerId, teamId);
  });
});

// URL에서 파라미터 추출 함수
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// 담당자 목록 로드
function loadManagers(selectedManagerId) {
  $.ajax({
    url: `${API_BASE_URL}/managers`,
    method: "GET",
    success: function (data) {
      console.log("담당자 목록:", data);

      const managerSelect = $("#change-assign-manager");
      managerSelect.find('option:not([value=""])').remove();

      data.forEach((manager) => {
        if (manager._id && manager.name) {
          const option = `<option value="${manager._id}">${manager.name}</option>`;
          managerSelect.append(option);
        } else {
          console.warn("Unexpected manager format:", manager);
        }
      });

      if (selectedManagerId) {
        managerSelect.val(selectedManagerId);
      }
    },
    error: function (err) {
      console.error("담당자 목록 로드 실패:", err);
      alert("담당자 목록을 불러오는 데 실패했습니다.");
    },
  });
}

// 팀 목록 로드
function loadTeams(selectedTeamId) {
  $.ajax({
    url: `${API_BASE_URL}/teams`,
    method: "GET",
    success: function (data) {
      console.log("팀 목록:", data);

      const teamSelect = $("#change-assign-team");
      teamSelect.find('option:not([value=""])').remove();

      data.forEach((team) => {
        if (team._id && team.name) {
          const option = `<option value="${team._id}">${team.name}</option>`;
          teamSelect.append(option);
        } else {
          console.warn("Unexpected team format:", team);
        }
      });

      if (selectedTeamId) {
        teamSelect.val(selectedTeamId);
      }
    },
    error: function (err) {
      console.error("팀 목록 로드 실패:", err);
      alert("팀 목록을 불러오는 데 실패했습니다.");
    },
  });
}

// 특정 차량 정보 로드 함수 (현재 배정 정보)
function loadCarInfo(carId) {
  $.ajax({
    url: `${API_BASE_URL}/car-registrations/${carId}`,
    method: "GET",
    success: function (car) {
      console.log("Loaded car data:", car);

      // 현재 배정 정보 로드
      const currentManagerId = car.manager ? car.manager._id : "";
      const currentTeamId = car.team ? car.team._id : "";

      // 담당자 및 팀 선택
      loadManagers(currentManagerId);
      loadTeams(currentTeamId);
    },
    error: function (err) {
      console.error("차량 정보 로드 실패:", err);
      alert("차량 정보를 로드하는 데 실패했습니다.");
    },
  });
}

// 배정 변경 요청 함수
function changeAssignment(carId, managerId, teamId) {
  const payload = {
    managerId: managerId || null,
    teamId: teamId || null,
  };

  $.ajax({
    url: `${API_BASE_URL}/car-registrations/${carId}/assign`,
    method: "PUT",
    contentType: "application/json",
    data: JSON.stringify(payload),
    success: function () {
      alert("차량 배정이 성공적으로 변경되었습니다.");
      window.location.href = "./car-allocation.html"; // 차량 배정 페이지로 이동
    },
    error: function (err) {
      console.error("차량 배정 변경 실패:", err);
      alert("차량 배정 변경에 실패했습니다.");
    },
  });
}
