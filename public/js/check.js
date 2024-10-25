// 전체 선택을 조작하는 훅

// 전체 선택을 눌렀을때
const clickAllCheck = (allCheckId, checkClass) => {
  const $allCheckEl = $(allCheckId);
  const $checkEl = $(checkClass);

  $allCheckEl.on("change", function () {
    $checkEl.prop("checked", $(this).prop("checked"));
  });
};

// 해당하는 하나의 체크박스를 클릭했을 때 -> 전체 선택을 체크하거나 해제해야함
const clickSingleCheck = (allCheckId, checkClass) => {
  const $allCheckEl = $(allCheckId);
  const $checkEl = $(checkClass);

  $checkEl.on("change", function () {
    const allChecked = $checkEl.length === $checkEl.filter(":checked").length;
    $allCheckEl.prop("checked", allChecked);
  });
};
