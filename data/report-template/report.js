function getTabs() {
  return $('.chart-card-tab');
}

function activateTabItem($tabItem) {
  $tabItem.addClass('chart-card-tab-item-active');
  activateTab($tabItem);
}

function activateFirstTab() {
  getTabs().each(function() {
    activateTabItem($(this).find('.chart-card-tab-item:first'));
  })
}

function addTabClickEventListener() {
  $('.chart-card-tab-item').on('click', function() {
    var $tabItem = $(this);
    $tabItem.siblings('.chart-card-tab-item').removeClass('chart-card-tab-item-active');
    activateTabItem($tabItem);
  });
}

function activateTab($tabItem) {
  var tool = $tabItem.attr('tool');
  var core = $tabItem.attr('core');

  $('.' + tool + '-tab-content').addClass('hide');
  $('.' + tool + '-tab-content-' + core).removeClass('hide');
}

$(function() {
  activateFirstTab();
  addTabClickEventListener();
});
