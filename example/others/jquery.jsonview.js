(function($){function isCollapsable(arg){return arg instanceof Object&&Object.keys(arg).length>0;}
function isUrl(string){var regexp=/^(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;return regexp.test(string);}
function json2html(json,options){var html='';if(typeof json==='string'){json=json.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/ /g, '&nbsp;');if(isUrl(json))
html+='<a href="'+json+'" class="json-string">'+json+'</a>';else
html+='<span class="json-string">"'+json+'"</span>';}
else if(typeof json==='number'){html+='<span class="json-literal">'+json+'</span>';}
else if(typeof json==='boolean'){html+='<span class="json-literal">'+json+'</span>';}
else if(json===null){html+='<span class="json-literal">null</span>';}
else if(json instanceof Array){if(json.length>0){html+='[<ol class="json-array">';for(var i=0;i<json.length;++i){html+='<li>';if(isCollapsable(json[i])){html+='<a href class="json-toggle"></a>';}
html+=json2html(json[i],options);if(i<json.length-1){html+=',';}
html+='</li>';}
html+='</ol>]';}
else{html+='[]';}}
else if(typeof json==='object'){var key_count=Object.keys(json).length;if(key_count>0){html+='{<ul class="json-dict">';for(var key in json){if(json.hasOwnProperty(key)){html+='<li>';var keyRepr=options.withQuotes?'<span class="json-string">"'+key+'"</span>':key;if(isCollapsable(json[key])){html+='<a href class="json-toggle">'+keyRepr+'</a>';}
else{html+=keyRepr;}
html+=': '+json2html(json[key],options);if(--key_count>0)
html+=',';html+='</li>';}}
html+='</ul>}';}
else{html+='{}';}}
return html;}
$.fn.jsonViewer=function(json,options){options=options||{};return this.each(function(){var html=json2html(json,options);if(isCollapsable(json))
html='<a href class="json-toggle"></a>'+html;$(this).html(html);$(this).off('click');$(this).on('click','a.json-toggle',function(){var target=$(this).toggleClass('collapsed').siblings('ul.json-dict, ol.json-array');target.toggle();if(target.is(':visible')){target.siblings('.json-placeholder').remove();}
else{var count=target.children('li').length;var placeholder=count+(count>1?' items':' item');target.after('<a href class="json-placeholder">'+placeholder+'</a>');}
return false;});$(this).on('click','a.json-placeholder',function(){$(this).siblings('a.json-toggle').click();return false;});if(options.collapsed==true){$(this).find('a.json-toggle').click();}});};})(jQuery);