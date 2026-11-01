/* ============ 语言：中文 / English ============ */
let LANG=(()=>{try{return localStorage.getItem('dc-lang')}catch(e){return null}})()==='en'?'en':'zh';
const L=(zh,en)=>LANG==='en'?en:zh;
/* ============ 基础：等轴测投影 ============ */
const C30=Math.cos(Math.PI/6),S30=0.5,NS='http://www.w3.org/2000/svg';
const P=(x,y,z)=>[(x-y)*C30,(x+y)*S30-z];
const pts=a=>a.map(p=>{const q=P(p[0],p[1],p[2]);return q[0].toFixed(1)+','+q[1].toFixed(1)}).join(' ');
function el(tag,attrs,parent){const e=document.createElementNS(NS,tag);if(attrs)for(const k in attrs){if(attrs[k]!=null)e.setAttribute(k,attrs[k])}if(parent)parent.appendChild(e);return e}
function grp(par,o={}){const g=el('g',{class:o.cls||''},par);if(o.id)g.dataset.id=o.id;if(o.kb){g.dataset.kb=o.kb;g.classList.add('pick')}if(o.go)g.dataset.go=o.go;if(o.tip)g.dataset.tip=o.tip;if(o.ctx)g.dataset.ctx=o.ctx;return g}
function box(par,{x,y,z,w,d,h,mat='metal',cls=''}){
  const g=el('g',{class:`bx m-${mat} ${cls}`},par);
  el('polygon',{class:'t',points:pts([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]])},g);
  el('polygon',{class:'f',points:pts([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]])},g);
  el('polygon',{class:'s',points:pts([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]])},g);
  return g}
const fRect=(par,Y,x1,z1,x2,z2,cls)=>el('polygon',{class:cls,points:pts([[x1,Y,z1],[x2,Y,z1],[x2,Y,z2],[x1,Y,z2]])},par);
const tRect=(par,Z,x1,y1,x2,y2,cls)=>el('polygon',{class:cls,points:pts([[x1,y1,Z],[x2,y1,Z],[x2,y2,Z],[x1,y2,Z]])},par);
function fText(par,Y,x,z,s,cls,size=12,anchor='start'){const q=P(x,Y,z);const t=el('text',{class:cls,transform:`matrix(${C30},${S30},0,1,${q[0]},${q[1]})`,'font-size':size,'text-anchor':anchor},par);t.textContent=s;return t}
function tText(par,Z,x,y,s,cls,size=12,anchor='start'){const q=P(x,y,Z);const t=el('text',{class:cls,transform:`matrix(${C30},${S30},${-C30},${S30},${q[0]},${q[1]})`,'font-size':size,'text-anchor':anchor},par);t.textContent=s;return t}
function fDot(par,Y,x,z,r,cls){const q=P(x,Y,z);return el('ellipse',{class:cls,cx:q[0],cy:q[1],rx:r*C30+.4,ry:r},par)}
const line3=(par,arr,cls)=>el('polyline',{class:cls,points:pts(arr)},par);

/* ============ 设备模型 ============ */
const SLOTS=[
  {n:1,type:'LPU'},{n:2,type:'LPU'},{n:3,type:'LPU'},{n:4,type:'LPU'},
  {n:5,type:'MPU',role:'主用'},{n:6,type:'MPU',role:'备用'},
  {n:7,type:'SFU'},{n:8,type:'SFU'},{n:9,type:'LPU'},{n:10,type:null}];
const LPUS=SLOTS.filter(s=>s.type==='LPU').map(s=>s.n);
const PICS=[{p:0,kind:'ge',name:'8×GE 光口子卡',en:'8×GE optical',count:8,prefix:'GigabitEthernet',kb:'pic-ge'},{p:1,kind:'100ge',name:'2×100GE 光口子卡',en:'2×100GE optical',count:2,prefix:'100GE',kb:'pic-100ge'}];
const IF={};let sysname='HUAWEI';
function addIf(name,o,T=IF){T[name]=Object.assign({name,admin:true,ip:null,len:null,desc:'',kind:'phy',cable:false,parent:null,vid:null},o)}
LPUS.forEach(n=>PICS.forEach(pc=>{for(let k=0;k<pc.count;k++)addIf(`${pc.prefix}${n}/${pc.p}/${k}`,{slot:n,pic:pc.p,port:k,speed:pc.kind==='ge'?'1Gbps':'100Gbps',optic:pc.kind==='ge'?'SFP':'QSFP28'})}));
['GigabitEthernet1/0/0','GigabitEthernet1/0/1','100GE1/1/0','GigabitEthernet2/0/0','100GE3/1/0','100GE9/1/0','GigabitEthernet4/0/3'].forEach(n=>IF[n].cable=true);
Object.assign(IF['GigabitEthernet1/0/0'],{ip:'10.1.1.1',len:30,desc:'To_CE1'});
Object.assign(IF['100GE1/1/0'],{ip:'10.0.12.1',len:30,desc:'To_P2'});
Object.assign(IF['100GE3/1/0'],{ip:'10.0.13.1',len:30,desc:'To_P3'});
IF['GigabitEthernet1/0/1'].admin=false;
addIf('GigabitEthernet1/0/0.100',{kind:'sub',parent:'GigabitEthernet1/0/0',vid:100,ip:'192.168.100.1',len:24,desc:'Customer_A'});
addIf('LoopBack0',{kind:'loop',ip:'1.1.1.1',len:32});
addIf('NULL0',{kind:'null'});
const phyUp=i=>i.kind==='phy'?(i.admin&&i.cable):i.kind==='sub'?(i.admin&&phyUp(IF[i.parent])):i.admin;
/* 两阶段生效：命令行改的是候选配置 CIF，commit 后才写入运行配置 IF（设备图只画 IF） */
const clone=o=>JSON.parse(JSON.stringify(o));let CIF=clone(IF),csys=sysname,pending=false;
const protoUp=i=>phyUp(i)&&(i.kind==='null'||!!i.ip)&&(i.kind!=='sub'||!!i.vid);
const portIf=(n,p,k)=>`${PICS[p].prefix}${n}/${p}/${k}`;
function macOf(name){let h=0;for(const c of name)h=(h*31+c.charCodeAt(0))>>>0;const b=[0x00,0xe0,0xfc,(h>>16)&255,(h>>8)&255,h&255].map(v=>v.toString(16).padStart(2,'0'));return `${b[0]}${b[1]}-${b[2]}${b[3]}-${b[4]}${b[5]}`}

/* ---------- 多种设备：路由器 / 交换机 / 防火墙 / 抗 DDoS（槽位布局都是简化示意） ---------- */
let DEV=(()=>{try{return localStorage.getItem('dc-dev')}catch(e){return null}})();
const mkSlots=a=>a.map(([n,type,kb,role])=>({n,type,kb,role}));
const DEVS={
  router:{zh:'路由器',en:'Router',kb:'chassis',slots:SLOTS},
  switch:{zh:'交换机',en:'Switch',model:'S12700E',kb:'swChassis',topo:'mactable',slots:mkSlots([[1,'LPU','swLPU'],[2,'LPU','swLPU'],[3,'LPU','swLPU'],[4,'LPU','swLPU'],[5,'MPU','MPU','主用'],[6,'MPU','MPU','备用'],[7,'SFU','SFU'],[8,'SFU','SFU'],[9,'LPU','swLPU'],[10,'CMU','cmu']])},
  fw:{zh:'防火墙',en:'Firewall',model:'USG12000',kb:'fwChassis',topo:'zone',slots:mkSlots([[1,'LPU','xLPU'],[2,'LPU','xLPU'],[3,'SPU','fwSPU'],[4,'SPU','fwSPU'],[5,'MPU','MPU','主用'],[6,'MPU','MPU','备用'],[7,'SFU','SFU'],[8,'SFU','SFU'],[9,'SPU','fwSPU'],[10,null]])},
  ads:{zh:'抗 DDoS',en:'Anti-DDoS',model:'AntiDDoS12000',kb:'adsChassis',topo:'detect',slots:mkSlots([[1,'LPU','xLPU'],[2,'LPU','xLPU'],[3,'SPU','adsSPU'],[4,'SPU','adsSPU'],[5,'MPU','MPU','主用'],[6,'MPU','MPU','备用'],[7,'SFU','SFU'],[8,'SFU','SFU'],[9,'SPU','adsSPU'],[10,'SPU','adsSPU']])}};
if(!DEVS[DEV])DEV='router';
const dv=()=>DEVS[DEV],skb=s=>s.kb||s.type;

/* ============ 知识库 ============ */
const KB={
chassis:{tag:'整机',title:'框式路由器',en:'Chassis-based Router',
  sum:'骨干网和城域核心常用的大容量设备。整机由机框、背板、各类单板、电源和风扇组成。单板插在槽位里，通过机框里的背板互相连通。',
  pts:['控制平面和转发平面分离：主控板 MPU 负责"想"，运行路由协议、算出路由；接口板 LPU 负责"做"，按转发表把报文送出去。','分布式转发：每块接口板都有自己的转发芯片和转发表，普通报文不经过主控板。','关键部件都有冗余：主控 1:1 主备，交换网板 N+1，电源和风扇也有备份。','和它相对的是盒式设备：端口固定、没有可插拔单板，结构简单但扩展性差。','参考机型 NetEngine 8000 X8：高 15.8U，共 18 个槽位，其中 8 个业务槽；主控 1:1，交换网 7+1，电源模块最多 10 个（N+1），3 个风扇组件。本演示的机框是简化画法，槽位布局不对应真机。'],
  src:[['NetEngine 8000E X 系列 Datasheet（华为公开资料）','https://e-file.huawei.com/marketingcloud/pep/asset/20000001/Material/1d4cffa4149c4a9ab9ef95a563156690/M3T1A590N1110310507990728778/NetEngine%208000E%20X%20Series%20Router%20Datasheet%20V8R024C10.pdf']],
  cfg:['display device','display version'],note:'display device 是认识一台新设备的第一条命令，能看到每个槽位插了什么板、是否在位、是否正常。'},
slot:{tag:'结构',title:'槽位',en:'Slot',sum:'机框上插单板的位置。槽位号就是接口名称里的第一个数字，例如 GigabitEthernet1/0/0 在 1 号槽。',
  pts:['槽位有用途约束：主控槽只能插主控板，接口板槽只能插接口板。','没有插板的槽位要装假面板，保证风道正常、防止灰尘进入。','本演示为了好看把所有板都画在前面，很多真实设备的交换网板在机框背面。']},
LPU:{tag:'单板',title:'接口板 LPU',en:'Line Processing Unit',
  sum:'也叫线卡。它承载子卡和物理端口，负责报文的接收、查表、转发。路由器的转发性能主要由接口板决定。',
  pts:['核心是网络处理器 NP：解析报文头、查 FIB、修改报文、决定从哪里出去。','流量管理芯片 TM 负责排队和调度，QoS 的各种动作最终在这里执行。','主控板算好的转发表会下发到每块接口板，接口板自己查表，这就是"分布式转发"。','子卡插在接口板上，决定端口的类型和速率。'],
  cfg:['display device','display interface brief'],drill:'点击单板查看内部'},
MPU:{tag:'单板',title:'主控板 MPU',en:'Main Processing Unit',
  sum:'设备的大脑，属于控制平面。运行 OSPF、IS-IS、BGP 等协议，生成路由表，并把转发表下发给接口板；同时负责设备管理、配置保存、日志告警。',
  pts:['一般两块，1:1 主备。主用板工作，备用板实时同步状态。','主用板故障时自动倒换到备用板。配合 NSR（不间断路由）等技术，邻居感知不到，业务不中断。','面板上有 Console 口和管理网口，开局时就是通过它们登录设备。','主控板不参与普通报文转发，只处理"发给自己"的协议报文和管理报文。'],
  cfg:['display device'],drill:'点击单板查看内部'},
SFU:{tag:'单板',title:'交换网板 SFU',en:'Switch Fabric Unit',
  sum:'负责接口板之间的报文交换。报文从一块接口板进来、要从另一块接口板出去时，就要经过交换网板。',
  pts:['入口接口板把报文切成固定长度的"信元"，交换网板按信元做无阻塞交换，出口接口板再重组成报文。','多块交换网板负荷分担，常见 N+1 冗余，坏一块不影响业务，只是总交换容量下降。','交换网板的总交换能力决定了整机能转发多少流量，是设备选型的重要指标。','参考：NetEngine 8000 X8 的交换网板是 7+1 备份。'],src:[['NetEngine 8000E X 系列 Datasheet','https://e-file.huawei.com/marketingcloud/pep/asset/20000001/Material/1d4cffa4149c4a9ab9ef95a563156690/M3T1A590N1110310507990728778/NetEngine%208000E%20X%20Series%20Router%20Datasheet%20V8R024C10.pdf']],drill:'点击单板查看内部'},
filler:{tag:'结构',title:'假面板',en:'Filler Panel',sum:'空槽位上的挡板。它不是可有可无的装饰：没有它，风会从空槽位"短路"流走，其他单板散热就会变差。',pts:['10 号槽当前为空，display device 中会显示 Absent。']},
power:{tag:'部件',title:'电源模块',en:'Power Supply Unit',sum:'为整机供电，支持交流或直流（机房常用 -48V 直流）。',pts:['冗余方式常见 N+1（多一个备用模块）或 N+N（两路独立供电各带一半模块）。','电源模块一般支持热插拔，可以在线更换。','参考：NetEngine 8000 X8 最多 10 个电源模块，N+1 备份；支持 DC -48/-60V、AC 200~240V、HVDC 240/380V 输入。'],src:[['NetEngine 8000E X 系列 Datasheet','https://e-file.huawei.com/marketingcloud/pep/asset/20000001/Material/1d4cffa4149c4a9ab9ef95a563156690/M3T1A590N1110310507990728778/NetEngine%208000E%20X%20Series%20Router%20Datasheet%20V8R024C10.pdf']]},
fan:{tag:'部件',title:'风扇框',en:'Fan Tray',sum:'负责整机散热。风道一般是前进后出或左进右出，机房摆放时要保证风道方向一致。',pts:['风扇转速随温度自动调节。','风扇故障会产生告警，长时间高温可能导致单板复位。','参考：NetEngine 8000 X8 有 3 个风扇组件，风道前进后出。'],src:[['NetEngine 8000E X 系列 Datasheet','https://e-file.huawei.com/marketingcloud/pep/asset/20000001/Material/1d4cffa4149c4a9ab9ef95a563156690/M3T1A590N1110310507990728778/NetEngine%208000E%20X%20Series%20Router%20Datasheet%20V8R024C10.pdf']]},
backplane:{tag:'结构',title:'背板',en:'Backplane',sum:'机框内部的一块大电路板，所有单板插上去后通过它互联。背板上走两类通道：业务数据通道（接口板 ↔ 交换网板）和管理控制通道（主控板 ↔ 各单板）。',pts:['打开右上角的透视按钮可以看到它。','背板一般是无源的，几乎不会坏，所以整机可靠性很高。']},
np:{tag:'芯片 · 通用原理示意',title:'网络处理器 NP',en:'Network Processor',sum:'接口板上最核心的转发芯片，属于转发平面。每个报文都要经过它。',
  pts:['解析：读出报文的二层头、IP 头、MPLS 标签、SRv6 SID 等。','查表：用目的地址查 FIB，得到出接口和下一跳；还会查 ACL、QoS 策略。','修改：TTL 减 1，重写二层头，压入或弹出标签。','NP 是可编程的，新特性往往靠升级微码支持；ASIC 速度更快但不灵活。']},
tm:{tag:'芯片 · 通用原理示意',title:'流量管理芯片 TM',en:'Traffic Manager',sum:'负责报文的排队、调度和整形。端口带宽不够用时，它决定谁先走、谁等待、谁被丢弃。',pts:['每个端口有多个优先级队列（常见 8 个），对应不同业务等级。','调度方式有 SP（严格优先）、WFQ（加权公平）等。','后面的 QoS 课程讲的拥塞管理、拥塞避免、流量整形，都是在这里执行的。']},
lcpu:{tag:'芯片 · 通用原理示意',title:'接口板 CPU',en:'Line Card CPU',sum:'接口板自己的管理处理器。它接收主控板下发的路由表项、ACL 等，并写进 NP 和表项存储；同时上报本板状态。',pts:['它不参与逐包转发，转发由 NP 完成。']},
tcam:{tag:'芯片 · 通用原理示意',title:'表项存储 TCAM',en:'Ternary CAM / SRAM',sum:'存放 FIB、ACL、MAC 表等转发表项。TCAM 能在一个时钟周期内完成最长前缀匹配。',pts:['它的容量决定了设备能支持多少条路由，叫做"FIB 规格"。','互联网全路由的规模在百万条量级，对表项容量要求很高。']},
conn:{tag:'结构',title:'背板连接器',en:'Backplane Connector',sum:'单板和背板对接的高速连接器。单板插到位后，业务数据和管理信号都从这里进出。',pts:['单板热插拔时，连接器的长短针设计保证先接地、再通电，避免冲击。']},
mem:{tag:'芯片 · 通用原理示意',title:'内存',en:'DDR Memory',sum:'主控 CPU 的内存，存放路由协议的数据库（如 OSPF 的 LSDB、BGP 的路由表）。路由规模越大，占用越多。',pts:[]},
flash:{tag:'芯片 · 通用原理示意',title:'存储器',en:'Flash / SSD',sum:'保存系统软件和配置文件。执行 save 后，配置写入这里，重启后不丢失。',pts:['当前运行的配置叫 current-configuration，保存下来的叫 saved-configuration。'],cfg:['display current-configuration'],note:'演示版没有实现 save 命令。'},
clock:{tag:'芯片 · 通用原理示意',title:'时钟模块',en:'Clock Module',sum:'为整机提供时钟和时间同步，支持 1588v2、同步以太网等。5G 承载网对时间同步要求很高。',pts:[]},
mgmt:{tag:'接口',title:'管理接口',en:'Console / MGMT ETH / USB',sum:'Console 口用串口线直连，开局或网络不通时救命用；管理网口用于带外管理（网管系统通过它管理设备）；USB 口可以用来开局或升级。',pts:['带外管理：管理流量和业务流量分开，业务网络故障时仍能登录设备。','网管平台可以走管理口做带外管理，也可以通过业务网络里的 LoopBack 地址做带内管理。']},
swchip:{tag:'芯片 · 通用原理示意',title:'交换芯片',en:'Switch Fabric Chip',sum:'交换网板上的核心芯片，把来自各接口板的信元交换到目标接口板。',pts:['常见的是 Crossbar 或多级 CLOS 架构。']},
dcdc:{tag:'部件',title:'板载电源',en:'DC/DC Converter',sum:'把背板送来的电压转换成芯片需要的各种低电压。',pts:[]},
'pic-ge':{tag:'子卡',title:'8×GE 光口子卡',en:'Physical Interface Card',sum:'插在接口板上的子卡，提供 8 个千兆以太网 SFP 光口。子卡号是接口名称的第二个数字：GigabitEthernet1/0/3 就在 1 号槽 0 号子卡的第 3 个口。',
  pts:['同一块接口板可以插不同的子卡，灵活组合端口类型。','子卡上的 PHY/MAC 芯片负责物理层和二层的收发。','子卡一般支持热插拔。'],cfg:['display interface brief'],drill:'点击子卡查看端口'},
'pic-100ge':{tag:'子卡',title:'2×100GE 光口子卡',en:'Physical Interface Card',sum:'提供 2 个 100G 以太网 QSFP28 光口，一般用于设备之间的骨干互联。',pts:['100GE 端口可以用拆分线缆拆成 4×25GE 使用（依设备支持情况）。','接口名称以 100GE 开头，如 100GE1/1/0。'],cfg:['display interface brief'],drill:'点击子卡查看端口'},
phy:{tag:'芯片 · 通用原理示意',title:'PHY / MAC 芯片',en:'PHY & MAC',sum:'PHY 负责物理层：把电信号和比特流互相转换、做编码。MAC 负责二层：把比特流组装成以太网帧，检查 FCS 校验和。',pts:['端口的 PHY 状态（up/down）就是这里检测到的链路信号。','CRC 错包计数也在这里统计，是排查链路质量的重要依据。']},
port:{tag:'接口',title:'物理端口',en:'Port',sum:'子卡面板上的插槽，插入光模块后接上光纤就成为一条物理链路的一端。',pts:['端口是硬件，接口是软件里对它的抽象。配置都是针对接口做的。','指示灯亮表示物理层 up。'],drill:'点击端口查看接口'},
optic:{tag:'部件',title:'光模块',en:'Optical Transceiver',sum:'把电信号转成光信号发出去，再把收到的光转回电信号。',
  pts:['封装：SFP（1G）、SFP+（10G）、SFP28（25G）、QSFP28（100G）、QSFP-DD（400G/800G）。','类型：多模（短距离，几百米）和单模（长距离，10km 到 80km）。','两端光模块的速率和波长要匹配。','收发光功率是判断链路好坏的关键指标。'],cfg:['display transceiver interface GigabitEthernet1/0/0']},
fiber:{tag:'链路',title:'光纤',en:'Fiber',sum:'承载光信号的物理介质。黄色外皮通常是单模光纤，橙色或水绿色通常是多模光纤。',pts:['常见接头：LC（小方头，最常用）、SC（大方头）、MPO（多芯，用于 100G/400G 并行光）。','一条链路两端的设备端口通过光纤相连，在拓扑里就是一条"物理链路"。']},
ifname:{tag:'概念',title:'接口命名规则',en:'Interface Naming',sum:'接口名 = 接口类型 + 槽位号/子卡号/端口号。读懂它，就能从一个名字直接定位到机框上的物理位置。',
  pts:['物理接口类型名如 GigabitEthernet、10GE、25GE、50GE、100GE、400GE，还有 50|100GE（默认 50G，可切到 100G）。','逻辑接口如 Eth-Trunk（链路聚合）、LoopBack（环回）、NULL0、Tunnel。','槽位号：板插在机框的哪个槽。','子卡号：板上的哪块子卡，从 0 开始。','端口号：子卡上的第几个口，从 0 开始。','子接口在后面加点和编号：GigabitEthernet1/0/0.100。','华为配置指南里的例子是 GigabitEthernet0/2/0、100GE0/1/0。槽位号从 0 还是 1 开始因设备而异，本演示从 1 开始（示意）。'],src:[['NetEngine 8000 配置指南：接口管理','https://support.huawei.com/enterprise/en/doc/EDOC1100335691/40b0decd/interface-management-configuration']]},
physif:{tag:'接口',title:'物理接口与状态',en:'Physical Interface',sum:'接口有两个状态。PHY（物理状态）：光信号正常就 up。Protocol（协议状态）：链路层协商成功、配置了 IP 等条件满足后才 up。',
  pts:['PHY down：多半是没插光纤、光模块坏、对端没开、光功率不够。','*down：管理员执行了 shutdown，接口被手动关掉。','PHY up 但 Protocol down：物理通了，但上层没起来，例如没配 IP 或两端封装不一致。','本演示中 Protocol up 的简化条件是：PHY up 且配置了 IP 地址。'],
  cfg:['display interface brief','system-view','interface GigabitEthernet1/0/1','undo shutdown','commit','display this'],note:'GigabitEthernet1/0/1 插了光纤但被 shutdown，执行 undo shutdown 并 commit 后它会 up，左侧端口灯会亮。'},
mac:{tag:'概念',title:'数据链路层',en:'Ethernet / MAC',sum:'以太网接口有自己的 MAC 地址，同一链路上的设备用 MAC 地址互相找到对方。MTU 决定一个帧最多能装多少字节（默认 1500）。',pts:['三层转发时，路由器每转发一跳都会重写二层头：源 MAC 换成自己出接口的 MAC，目的 MAC 换成下一跳的 MAC。','两端 MTU 不一致会导致大包丢失，OSPF 邻居也可能起不来。']},
l2l3:{tag:'概念',title:'三层接口',en:'Layer-3 Interface',sum:'配置了 IP 地址的接口就是三层接口，路由器靠它们参与 IP 转发和路由协议。',pts:['接口 IP 和掩码决定了"直连路由"：配好 10.1.1.1/30，路由表里就自动出现 10.1.1.0/30。','/30 掩码只有 2 个可用地址，正好给点到点链路两端使用。','有的接口可以在二层（交换）和三层（路由）之间切换，路由器上默认一般是三层。'],
  cfg:['system-view','interface GigabitEthernet1/0/2','ip address 10.1.2.1 255.255.255.252','commit','display this','quit','display ip interface brief'],note:'GigabitEthernet1/0/2 没插光纤，所以即使配了 IP，Protocol 仍然是 down。'},
subif:{tag:'接口',title:'子接口',en:'Sub-interface',sum:'把一个物理接口按 VLAN 拆成多个逻辑接口，每个子接口有自己的 IP、可以属于不同的 VPN。这是 PE 设备接入多个客户的常见做法。',
  pts:['子接口编号写在点后面，通常和 VLAN 号保持一致，方便维护。','dot1q termination vid 100：表示这个子接口只接收、只发送 VLAN 100 的帧。','物理接口 down 了，它下面的所有子接口都会 down。','后续 L3VPN 课程会把子接口绑定到 VPN 实例。'],
  cfg:['system-view','interface GigabitEthernet1/0/0.200','dot1q termination vid 200','ip address 192.168.200.1 24','commit','display this'],note:'commit 后左侧接口视图会多出一个子接口。'},
loopback:{tag:'接口',title:'LoopBack 接口',en:'Loopback Interface',sum:'纯软件的逻辑接口，只要设备在运行它就一直 up，不受任何物理链路影响。',
  pts:['常用作 Router ID、BGP 邻居地址、设备管理地址，因为它最稳定。','掩码一般用 /32。'],src:[['NetEngine 8000 配置指南：接口管理','https://support.huawei.com/enterprise/en/doc/EDOC1100335691/40b0decd/interface-management-configuration']],cfg:['system-view','interface LoopBack1','ip address 2.2.2.2 32','commit','quit','display ip interface brief']},
trunk:{tag:'接口',title:'Eth-Trunk 链路聚合',en:'Link Aggregation',sum:'把多条物理链路捆绑成一条逻辑链路，带宽叠加，一条断了其他的继续工作。',pts:['成员口的速率、双工要一致。','LACP 模式会和对端协商，比手工模式更安全。','流量按 hash 分担到成员口上，单条流只会走一个成员口。'],cfg:['interface Eth-Trunk1','trunkport GigabitEthernet 2/0/0 to 2/0/1','mode lacp-static'],run:false,note:'演示版命令行暂不支持 Eth-Trunk，这里只做配置展示。'},
tunnel:{tag:'接口',title:'Tunnel 接口',en:'Tunnel Interface',sum:'隧道的逻辑接口，比如 MPLS TE 隧道、GRE 隧道。报文进入 Tunnel 接口后会被封装上新的头部，沿着隧道路径走。',pts:['后续的静态/动态隧道、SRv6 Policy 课程会详细展开。'],run:false},
null0:{tag:'接口',title:'NULL0 接口',en:'Null Interface',sum:'"黑洞"接口，发往它的报文全部丢弃。系统自动创建，常用于防止路由环路，或者过滤某些目的地址的流量。',pts:['NULL0 永远 up，不能配置 IP。'],src:[['NetEngine 8000 配置指南：接口管理','https://support.huawei.com/enterprise/en/doc/EDOC1100335691/40b0decd/interface-management-configuration']]},
vpnpre:{tag:'预告',title:'绑定 VPN 实例',en:'ip binding vpn-instance',sum:'接口（或子接口）绑定到 VPN 实例后，它的路由就进入这个 VPN 自己的路由表，和其他客户隔离。这是 L3VPN 的起点。',pts:['在 L3VPN 课程中会用动画演示两个客户使用同一网段也互不干扰。'],run:false,cfg:['ip vpn-instance vpna',' ipv4-family','  route-distinguisher 100:1','interface GigabitEthernet1/0/0.100',' ip binding vpn-instance vpna']},
};
/* ---------- 知识库英文版（结构同 KB，只放需要翻译的字段；英文模式下副标题显示中文名） ---------- */
const TAG_EN={'整机':'Whole device','结构':'Structure','单板':'Board','部件':'Component','芯片 · 通用原理示意':'Chip · generic principle','接口':'Interface','子卡':'Subcard','链路':'Link','概念':'Concept','预告':'Coming up'};
const DRILL_EN={'点击单板查看内部':'Click the board to look inside','点击子卡查看端口':'Click the subcard to see its ports','点击端口查看接口':'Click the port to see its interface'};
const SRC_EN={'NetEngine 8000E X 系列 Datasheet（华为公开资料）':'NetEngine 8000E X Series Datasheet (Huawei public document)','NetEngine 8000E X 系列 Datasheet':'NetEngine 8000E X Series Datasheet','NetEngine 8000 配置指南：接口管理':'NetEngine 8000 Configuration Guide: Interface Management'};
const KB_EN={
chassis:{title:'Chassis-based Router',sum:'A high-capacity device used in backbone and metro core networks. It is made of the chassis, backplane, boards, power supplies and fans. Boards sit in slots and connect to each other through the backplane inside the chassis.',
  pts:['The control plane and forwarding plane are separate: the MPU does the "thinking" (runs routing protocols, computes routes); the LPU does the "doing" (forwards packets by the forwarding table).','Distributed forwarding: every line card has its own forwarding chip and forwarding table, so ordinary packets never pass through the MPU.','Key parts are redundant: MPUs are 1:1 active/standby, switch fabric units are N+1, and power and fans have backups too.','The opposite is a fixed (box-type) device: fixed ports and no pluggable boards. It is simpler, but harder to expand.','Reference model NetEngine 8000 X8: 15.8 U high, 18 slots in total, 8 of them for service boards; MPU 1:1, switch fabric 7+1, up to 10 power modules (N+1), 3 fan assemblies. The chassis in this demo is simplified, and its slot layout does not match the real device.'],
  note:'display device is the first command to run on a new device. It shows which board sits in each slot, whether it is present and whether it is healthy.'},
slot:{title:'Slot',sum:'A position in the chassis where a board plugs in. The slot number is the first number in an interface name: GigabitEthernet1/0/0 is in slot 1.',
  pts:['Slots have roles: an MPU slot only takes an MPU, and a line card slot only takes a line card.','Empty slots need a filler panel to keep the airflow right and the dust out.','To keep the picture clear, this demo draws every board on the front. On many real devices the switch fabric units sit at the back.']},
LPU:{title:'Line Processing Unit (LPU)',sum:'Also called a line card. It carries subcards and physical ports, and receives, looks up and forwards packets. A router\'s forwarding performance is mostly decided by its line cards.',
  pts:['Its core is the network processor (NP): it parses headers, looks up the FIB, edits the packet and decides where it leaves.','The traffic manager (TM) handles queuing and scheduling; QoS actions are finally carried out here.','The forwarding table computed by the MPU is pushed to every line card, and each card does its own lookups. This is "distributed forwarding".','Subcards plug into the line card and decide the port types and speeds.']},
MPU:{title:'Main Processing Unit (MPU)',sum:'The brain of the device, in the control plane. It runs OSPF, IS-IS, BGP and other protocols, builds the routing table and pushes the forwarding table to the line cards. It also handles device management, saving configuration, logs and alarms.',
  pts:['Usually two boards, 1:1 active/standby. The active board works while the standby keeps its state in sync.','If the active board fails, the standby takes over automatically. With NSR (non-stop routing) and similar techniques, neighbors don\'t notice and services keep running.','The panel has a Console port and a management Ethernet port. That is how you log in when bringing up a new device.','The MPU does not forward ordinary packets. It only handles protocol and management packets addressed to the device itself.']},
SFU:{title:'Switch Fabric Unit (SFU)',sum:'Switches packets between line cards. A packet that enters on one line card and leaves on another passes through the switch fabric.',
  pts:['The ingress line card slices packets into fixed-length "cells", the fabric switches the cells without blocking, and the egress line card reassembles them into packets.','Several fabric boards share the load, often N+1. Losing one doesn\'t hurt services; it only lowers the total switching capacity.','Total fabric capacity sets how much traffic the whole device can forward, which makes it a key number when choosing a device.','Reference: NetEngine 8000 X8 uses 7+1 switch fabric backup.']},
filler:{title:'Filler Panel',sum:'A cover for an empty slot. It is not just decoration: without it, air "short-circuits" through the empty slot and the other boards are cooled less well.',pts:['Slot 10 is empty right now; display device shows it as Absent.']},
power:{title:'Power Supply Unit',sum:'Powers the whole device, with AC or DC input (equipment rooms often use -48 V DC).',pts:['Common redundancy schemes are N+1 (one spare module) and N+N (two independent feeds, each powering half of the modules).','Power modules are usually hot-swappable, so they can be replaced while the device is running.','Reference: NetEngine 8000 X8 takes up to 10 power modules with N+1 backup, and supports DC -48/-60 V, AC 200–240 V and HVDC 240/380 V input.']},
fan:{title:'Fan Tray',sum:'Cools the whole device. Airflow usually runs front-to-back or side-to-side, and devices in a room must be placed so the airflow directions match.',pts:['Fan speed adjusts automatically with temperature.','A fan failure raises an alarm; a long period of high temperature can make boards reset.','Reference: NetEngine 8000 X8 has 3 fan assemblies with front-to-back airflow.']},
backplane:{title:'Backplane',sum:'A large circuit board inside the chassis. Every board plugs into it and connects to the others through it. It carries two kinds of channels: data channels (line card ↔ switch fabric) and management/control channels (MPU ↔ every board).',pts:['Turn on the x-ray button at the top right to see it.','The backplane is usually passive and almost never fails, which helps make the whole device very reliable.']},
np:{title:'Network Processor (NP)',sum:'The core forwarding chip on a line card, in the forwarding plane. Every packet goes through it.',
  pts:['Parse: read the L2 header, IP header, MPLS labels, SRv6 SIDs and so on.','Look up: search the FIB with the destination address to get the outgoing interface and next hop; ACL and QoS policies are checked too.','Modify: decrement the TTL, rewrite the L2 header, push or pop labels.','An NP is programmable, so new features often arrive through a microcode upgrade. An ASIC is faster but less flexible.']},
tm:{title:'Traffic Manager (TM)',sum:'Queues, schedules and shapes packets. When port bandwidth runs short, it decides who goes first, who waits and who gets dropped.',pts:['Each port has several priority queues (often 8), mapped to different service classes.','Scheduling methods include SP (strict priority) and WFQ (weighted fair queuing).','Congestion management, congestion avoidance and traffic shaping from the later QoS lesson all happen here.']},
lcpu:{title:'Line Card CPU',sum:'The line card\'s own management processor. It receives route entries, ACLs and so on from the MPU and writes them into the NP and table memory. It also reports the board\'s status.',pts:['It does not forward packets one by one; the NP does that.']},
tcam:{title:'Table Memory (TCAM)',sum:'Stores forwarding entries such as the FIB, ACLs and the MAC table. A TCAM can finish a longest-prefix match in one clock cycle.',pts:['Its size decides how many routes the device can hold, known as the "FIB capacity".','The full Internet routing table is on the order of a million routes, which needs a lot of table capacity.']},
conn:{title:'Backplane Connector',sum:'The high-speed connector between a board and the backplane. Once the board is seated, data and management signals all pass through here.',pts:['For hot-swapping, longer and shorter pins make sure ground connects first and power second, avoiding surges.']},
mem:{title:'Memory (DDR)',sum:'Memory for the main CPU. It holds routing protocol databases, such as the OSPF LSDB and the BGP routing table. More routes means more memory.'},
flash:{title:'Storage (Flash / SSD)',sum:'Stores system software and configuration files. After save, the configuration is written here and survives a reboot.',pts:['The configuration in use is called current-configuration; the saved one is called saved-configuration.'],note:'The demo does not implement the save command.'},
clock:{title:'Clock Module',sum:'Provides the clock and time synchronization for the whole device, supporting 1588v2, Synchronous Ethernet and more. 5G transport networks have strict time-sync requirements.'},
mgmt:{title:'Management Ports',sum:'The Console port connects directly with a serial cable, a lifesaver when bringing up a new device or when the network is down. The management Ethernet port is for out-of-band management (a management system manages the device through it). The USB port can be used for deployment or upgrades.',pts:['Out-of-band management keeps management traffic separate from service traffic, so you can still log in when the service network fails.','A management platform can use the management port (out-of-band) or a LoopBack address reached through the service network (in-band).']},
swchip:{title:'Switch Fabric Chip',sum:'The core chip on the switch fabric board. It switches cells from each line card to the target line card.',pts:['Common designs are crossbar or multi-stage CLOS.']},
dcdc:{title:'On-board Power (DC/DC)',sum:'Converts the voltage from the backplane into the various low voltages the chips need.'},
'pic-ge':{title:'8×GE Optical Subcard',sum:'A subcard on the line card with 8 Gigabit Ethernet SFP optical ports. The subcard number is the second number in an interface name: GigabitEthernet1/0/3 is port 3 of subcard 0 in slot 1.',pts:['One line card can take different subcards to mix port types.','The PHY/MAC chip on the subcard handles physical-layer and layer-2 transmit and receive.','Subcards are usually hot-swappable.']},
'pic-100ge':{title:'2×100GE Optical Subcard',sum:'Provides 2 × 100G Ethernet QSFP28 optical ports, usually for backbone links between devices.',pts:['A 100GE port can be split into 4×25GE with a breakout cable (if the device supports it).','Interface names start with 100GE, for example 100GE1/1/0.']},
phy:{title:'PHY / MAC Chip',sum:'The PHY handles the physical layer: converting between electrical signals and bit streams, and encoding. The MAC handles layer 2: assembling bits into Ethernet frames and checking the FCS.',pts:['The port\'s PHY state (up/down) comes from the link signal detected here.','CRC error counters are kept here too, which is key evidence when checking link quality.']},
port:{title:'Physical Port',sum:'A socket on the subcard panel. With an optical module and fiber plugged in, it becomes one end of a physical link.',pts:['A port is hardware; an interface is the software view of it. Configuration is always done on interfaces.','A lit LED means the physical layer is up.']},
optic:{title:'Optical Transceiver',sum:'Turns electrical signals into light and sends them out, and turns received light back into electrical signals.',pts:['Form factors: SFP (1G), SFP+ (10G), SFP28 (25G), QSFP28 (100G), QSFP-DD (400G/800G).','Types: multimode (short reach, a few hundred meters) and single-mode (long reach, 10 km to 80 km).','The modules at both ends must match in speed and wavelength.','Transmit and receive optical power are the key indicators of link health.']},
fiber:{title:'Fiber',sum:'The physical medium that carries light. A yellow jacket usually means single-mode fiber; orange or aqua usually means multimode.',pts:['Common connectors: LC (small square, the most common), SC (larger square), MPO (multi-fiber, for parallel optics at 100G/400G).','The device ports at the two ends of a link are joined by fiber. In a topology, that is one "physical link".']},
ifname:{title:'Interface Naming',sum:'Interface name = interface type + slot/subcard/port. Once you can read it, a name takes you straight to a physical spot on the chassis.',
  pts:['Physical interface types include GigabitEthernet, 10GE, 25GE, 50GE, 100GE, 400GE, and 50|100GE (50G by default, switchable to 100G).','Logical interfaces include Eth-Trunk (link aggregation), LoopBack, NULL0 and Tunnel.','Slot number: which chassis slot the board sits in.','Subcard number: which subcard on the board, starting from 0.','Port number: which port on the subcard, starting from 0.','A sub-interface adds a dot and a number: GigabitEthernet1/0/0.100.','Examples in the Huawei configuration guide are GigabitEthernet0/2/0 and 100GE0/1/0. Whether slot numbers start at 0 or 1 depends on the device; this demo starts at 1 (illustrative).']},
physif:{title:'Physical Interface & Status',sum:'An interface has two states. PHY (physical): up when the optical signal is fine. Protocol: up only after the link layer negotiates successfully and conditions such as having an IP address are met.',
  pts:['PHY down: usually no fiber, a faulty optical module, the far end is off, or optical power is too low.','*down: an administrator ran shutdown and turned the interface off by hand.','PHY up but Protocol down: the physical link works but the upper layer is not up, for example no IP address or mismatched encapsulation at the two ends.','In this demo, Protocol is up (simplified) when PHY is up and an IP address is configured.'],
  note:'GigabitEthernet1/0/1 has fiber but is shut down. Run undo shutdown and commit, and it comes up: the port LED on the left lights.'},
mac:{title:'Data Link Layer',sum:'An Ethernet interface has its own MAC address, and devices on the same link find each other by MAC. The MTU sets how many bytes one frame can carry (1500 by default).',pts:['In layer-3 forwarding, the router rewrites the L2 header at every hop: the source MAC becomes its outgoing interface\'s MAC, and the destination MAC becomes the next hop\'s MAC.','An MTU mismatch between the two ends drops large packets and can stop OSPF neighbors from coming up.']},
l2l3:{title:'Layer-3 Interface',sum:'An interface with an IP address is a layer-3 interface. Routers use these to take part in IP forwarding and routing protocols.',pts:['The interface IP and mask create a "direct route": configure 10.1.1.1/30 and 10.1.1.0/30 appears in the routing table automatically.','A /30 mask has just 2 usable addresses, exactly enough for the two ends of a point-to-point link.','Some interfaces can switch between layer 2 (switching) and layer 3 (routing); on routers the default is usually layer 3.'],
  note:'GigabitEthernet1/0/2 has no fiber, so even with an IP address its Protocol stays down.'},
subif:{title:'Sub-interface',sum:'Splits one physical interface into several logical interfaces by VLAN. Each sub-interface has its own IP address and can belong to a different VPN. This is a common way for a PE to connect several customers.',
  pts:['The sub-interface number goes after the dot and usually matches the VLAN ID, which makes maintenance easier.','dot1q termination vid 100: this sub-interface only receives and sends frames in VLAN 100.','If the physical interface goes down, all of its sub-interfaces go down.','The later L3VPN lesson binds sub-interfaces to VPN instances.'],
  note:'After commit, a new sub-interface appears in the interface view on the left.'},
loopback:{title:'LoopBack Interface',sum:'A purely software logical interface. As long as the device is running it stays up, unaffected by any physical link.',pts:['Often used as the Router ID, the BGP peer address and the device management address, because it is the most stable.','The mask is usually /32.']},
trunk:{title:'Eth-Trunk (Link Aggregation)',sum:'Bundles several physical links into one logical link. Bandwidth adds up, and if one link breaks the others keep working.',pts:['Member ports must match in speed and duplex.','LACP mode negotiates with the peer and is safer than manual mode.','Traffic is spread across members by hash; a single flow only uses one member.'],note:'The demo CLI does not support Eth-Trunk yet; this is a configuration example only.'},
tunnel:{title:'Tunnel Interface',sum:'The logical interface of a tunnel, such as an MPLS TE tunnel or a GRE tunnel. A packet that enters it gets a new header and follows the tunnel path.',pts:['The later lessons on static/dynamic tunnels and SRv6 Policy cover this in detail.']},
null0:{title:'NULL0 Interface',sum:'A "black hole" interface: every packet sent to it is dropped. The system creates it automatically. It is often used to prevent routing loops or to filter traffic to certain destinations.',pts:['NULL0 is always up and cannot have an IP address.']},
vpnpre:{title:'Bind a VPN Instance',sum:'Once an interface (or sub-interface) is bound to a VPN instance, its routes go into that VPN\'s own routing table, isolated from other customers. This is where L3VPN starts.',pts:['The L3VPN lesson will animate two customers using the same subnet without interfering with each other.']},
};
/* 当前语言下的讲解条目：英文模式标题用英文，副标题显示中文名，方便对照术语 */
function kbOf(key){const k=KB[key];if(!k)return null;if(LANG!=='en')return k;const e=KB_EN[key]||{};
  return {...k,...e,tag:TAG_EN[k.tag]||k.tag,title:e.title||k.en,en:k.title,drill:e.drill||(k.drill&&(DRILL_EN[k.drill]||k.drill)),pts:e.pts||k.pts}}

/* ---------- 交换机 / 防火墙 / 抗 DDoS 的讲解条目（参数来自华为公开资料，通用原理单独标注） ---------- */
const SRC={
  s12700e:['CloudEngine S12700E 产品页（华为官网）','https://e.huawei.com/en/products/switches/campus-switches/s12700e'],
  s12700eCards:['CloudEngine S12700E 硬件描述：单板类型','https://support.huawei.com/enterprise/en/doc/EDOC1100089142/fcf3a10c/card-types'],
  vlanEx:['华为 S 系列交换机配置举例：基于接口划分 VLAN','https://support.huawei.com/enterprise/en/doc/EDOC1000141870/e2b68f76/example-for-configuring-interface-based-vlan-assignment-access-device-used-as-the-gateway'],
  usg12000:['HiSecEngine USG12000 产品页（华为官网）','https://e.huawei.com/en/products/security/usg12000'],
  zones:['华为配置指南：理解安全区域','https://support.huawei.com/enterprise/en/doc/EDOC1100336503/1e162ed7/understanding-security-zones'],
  session:['华为防火墙故障处理：检查会话表','https://support.huawei.com/enterprise/en/doc/EDOC1000179232/53e2aee8/checking-the-session-table'],
  ads:['AntiDDoS12000 系列 Datasheet（华为公开资料）','https://carrier.huawei.com/~/media/CNBGV2/download/products/networks/AntiDDoS12000-Series-DDoS-en.pdf']};
Object.assign(SRC_EN,{'CloudEngine S12700E 产品页（华为官网）':'CloudEngine S12700E product page (Huawei)','CloudEngine S12700E 硬件描述：单板类型':'CloudEngine S12700E Hardware Description: card types','华为 S 系列交换机配置举例：基于接口划分 VLAN':'Huawei S series switch example: interface-based VLAN assignment','HiSecEngine USG12000 产品页（华为官网）':'HiSecEngine USG12000 product page (Huawei)','华为配置指南：理解安全区域':'Huawei configuration guide: Understanding security zones','华为防火墙故障处理：检查会话表':'Huawei firewall troubleshooting: Checking the session table','AntiDDoS12000 系列 Datasheet（华为公开资料）':'AntiDDoS12000 Series Datasheet (Huawei public document)'});
Object.assign(TAG_EN,{'单板 · 示意':'Board · illustrative','概念 · 通用原理':'Concept · generic principle'});
const CFG_NOTE=['命令为示意，具体语法以对应设备和版本的华为配置指南为准。','Illustrative commands; check the Huawei configuration guide for your device and version for the exact syntax.'];
Object.assign(KB,{
swChassis:{tag:'整机',title:'框式交换机',en:'Chassis Switch',sum:'园区网核心层常用的大容量交换机。它和框式路由器一样由主控、交换网、接口板、电源、风扇组成，但强项是二层交换：端口多，按 VLAN 隔离，靠 MAC 地址表转发，同时也能做三层路由。',
  pts:['交换机和路由器最核心的区别：交换机主要按二层 MAC 地址转发（同一网段内），路由器按三层 IP 地址转发（跨网段）。现在的核心交换机两样都会，常被叫做"三层交换机"。','端口密度高：一块接口板常见 48 个 GE 或 10GE 口，用来连接大量下层交换机或服务器。','参考机型 CloudEngine S12700E：华为园区网的旗舰核心交换机。S12700E-4/-8/-12 分别有 4/8/12 个业务槽，主控槽都是 2 个，交换网槽为 2/4/4 个，风扇槽为 2/4/5 个。','S12700E-8 的交换容量为 38.4 Tbit/s（硬件可支持到 57.6 Tbit/s），转发性能 28,800 Mpps；单台可管理 10,240 个 AP、5 万以上无线用户。','本演示的槽位布局是简化画法，不对应真机。'],
  src:[SRC.s12700e,SRC.s12700eCards],drill:'点击单板查看内部，或点左上角「原理演示」看 VLAN 和 MAC 表'},
swLPU:{tag:'单板',title:'接口板（交换机）',en:'Interface Card',sum:'交换机的接口板端口直接做在板上，没有子卡。报文进来后，板上的转发芯片查 MAC 地址表（二层）或 FIB（三层），决定从哪个口出去。',
  pts:['S12700E 的接口板种类很多，例如 48 口 GE 电口、48 口 10GE 光口、40 口 25GE、24 口 100GE。','同一块板内端口之间的流量可以在板内转发，跨板的流量要经过交换网板。（通用原理）','MAC 地址表、FIB、ACL 等表项都存在接口板上。（通用原理）'],src:[SRC.s12700eCards],drill:'点击单板查看内部'},
cmu:{tag:'单板',title:'集中监控板 CMU',en:'Centralized Monitoring Unit',sum:'S12700E 的硬件描述里把它列为"集中监控单元"，负责对整机做集中监控。它不参与报文转发。',pts:['不是每种设备都有单独的监控板，路由器演示里就没有画。'],src:[SRC.s12700eCards]},
swfwd:{tag:'芯片 · 通用原理示意',title:'转发芯片',en:'Forwarding Chip',sum:'交换机接口板上的核心芯片。收到以太网帧后先查 MAC 地址表做二层转发；如果目的 MAC 是交换机自己的三层接口（VLANIF），就继续查 FIB 做三层转发。',pts:['二层转发不改报文内容，只决定从哪个端口出去。','三层转发和路由器一样：TTL 减 1，重写二层头。']},
swport:{tag:'接口',title:'Access 口和 Trunk 口',en:'Access & Trunk Ports',sum:'交换机端口按"怎么处理 VLAN 标签"分类型。Access 口一般接电脑、服务器，只属于一个 VLAN；Trunk 口一般接其他交换机，能同时放行多个 VLAN 的帧。',
  pts:['Access 口：收到不带标签的帧，归入本口的 VLAN（port default vlan）；发出时去掉标签。','Trunk 口：帧带着 802.1Q VLAN 标签传，对端据此知道它属于哪个 VLAN。','华为交换机还有 Hybrid 类型，可以分别指定哪些 VLAN 带标签、哪些不带。'],
  cfg:['vlan batch 10 20','interface GigabitEthernet1/0/1',' port link-type access',' port default vlan 10','interface GigabitEthernet1/0/24',' port link-type trunk',' port trunk allow-pass vlan 10 20'],run:false,note:'Access 口的命令来自华为配置举例；Trunk 口命令和接口编号为示意。',src:[SRC.vlanEx]},
vlan:{tag:'概念 · 通用原理',title:'VLAN 虚拟局域网',en:'Virtual LAN',sum:'把交换机的端口按逻辑分组，每组是一个独立的广播域。不同 VLAN 之间二层不通，就像接在不同的交换机上。',
  pts:['VLAN ID 范围是 1-4094，写在以太网帧的 802.1Q 标签里。','好处：缩小广播范围，隔离不同部门或业务，更安全。','不同 VLAN 之间要通信，必须经过三层：路由器，或三层交换机上的 VLANIF 接口。'],cfg:['vlan batch 10 20'],run:false,src:[SRC.vlanEx]},
mactable:{tag:'概念 · 通用原理',title:'MAC 地址表',en:'MAC Address Table',sum:'交换机做二层转发用的"通讯录"：记录哪个 MAC 地址在哪个端口、属于哪个 VLAN。',
  pts:['学习：收到帧时，把源 MAC 和入端口记下来。','转发：按目的 MAC 查表，查到了就只从对应端口发出。','泛洪：查不到（或者是广播帧），就在同一个 VLAN 的其他端口各发一份。','表项有老化时间，长时间没有流量的条目会被删掉，这样终端换了位置也能重新学到。'],cfg:['display mac-address'],run:false,drill:'点左上角的动画按钮，看 MAC 表是怎么一条条学出来的'},
vlanif:{tag:'接口',title:'VLANIF 接口',en:'VLANIF Interface',sum:'交换机上的三层逻辑接口，一个 VLAN 对应一个。给它配上 IP 地址，它就是这个 VLAN 里电脑的网关，不同 VLAN 之间的流量由它做三层转发。',
  pts:['电脑的默认网关就填 VLANIF 的 IP 地址。','这就是"三层交换机"能做路由的原因。'],cfg:['interface vlanif 10',' ip address 192.168.10.1 24','interface vlanif 20',' ip address 192.168.20.1 24'],run:false,src:[SRC.vlanEx]},
fwChassis:{tag:'整机',title:'框式防火墙',en:'Chassis Firewall',sum:'部署在网络边界（数据中心、大型企业和园区的出口）的安全设备。路由器关心"怎么走"，防火墙还要决定"让不让走"：按安全区域和安全策略检查每条连接，只放行被允许的流量。',
  pts:['状态检测：防火墙为每条放行的连接建一条会话，后续报文查会话表快速转发，回程报文也能自动放行。','常见功能：安全策略、NAT 地址转换、VPN、入侵防御、病毒检测等内容安全。','参考机型 HiSecEngine USG12000：华为称它为业界首款 T 级 AI 防火墙。USG12004 高 9.8U，USG12008 高 15.8U；接口板单槽最高 18×100GE，也有 4×400GE 的接口板。','可靠性：双主控备份，支持双机热备 HSB、NSR、GR；电源冗余，风扇模块可插拔。','本演示中的业务处理板 SPU 和槽位布局是通用示意，USG12000 的公开产品页没有给出这些单板细节。'],
  src:[SRC.usg12000],drill:'点击单板查看内部，或点左上角「原理演示」看安全策略和会话表'},
fwSPU:{tag:'单板 · 示意',title:'业务处理板 SPU',en:'Service Processing Unit',sum:'安全设备里"干重活"的单板：会话管理、安全策略匹配、NAT、内容检测都在这里做。流量从接口板进来，送到业务板处理完，再从接口板出去。',
  pts:['安全检测比普通转发复杂得多，要看到应用层甚至文件内容，所以需要大量 CPU 核和内存。','多块业务板一起分担流量，性能随板卡数量扩展。','以上是通用原理示意；USG12000 的公开产品页没有列出具体的业务板型号。'],drill:'点击单板查看内部'},
spucpu:{tag:'芯片 · 通用原理示意',title:'多核处理器',en:'Multi-core CPU',sum:'业务处理板上的多核 CPU，负责会话管理、策略匹配、内容检测等复杂计算。安全业务越复杂（例如解密、病毒检测），越吃 CPU。',pts:[]},
spumem:{tag:'芯片 · 通用原理示意',title:'大容量内存',en:'Memory',sum:'存放会话表、特征库、缓存的报文等。会话表能装多少条，直接决定设备能同时处理多少连接。',pts:[]},
zone:{tag:'概念',title:'安全区域',en:'Security Zone',sum:'防火墙把相连的网络分成不同的"区域"，每个区域有一个安全级别。流量在区域之间流动时，要接受安全策略的检查。',
  pts:['预定义区域：Untrust（5，低，例如互联网）、DMZ（50，中，放对外提供服务的服务器）、Trust（85，高，内网终端）、Local（100，最高，设备自身）。','接口加入某个区域后，接口连接的网络就属于这个区域；一个接口只能属于一个区域。','也可以自定义区域，优先级范围 1-100，数字越大越可信。'],
  cfg:['firewall zone trust',' add interface GigabitEthernet1/0/1','firewall zone untrust',' add interface GigabitEthernet1/0/2'],run:false,note:CFG_NOTE[0],src:[SRC.zones],drill:'点左上角的动画按钮，看报文怎么穿过防火墙'},
secpolicy:{tag:'概念',title:'安全策略',en:'Security Policy',sum:'防火墙的"门禁规则"：从哪个区域、哪个地址，到哪个区域、哪个地址，什么服务，允许还是拒绝。报文按顺序匹配规则，都没匹配上就按默认规则拒绝。',
  pts:['只需要管连接的首包：首包被放行后建立会话，后续报文和回程报文直接查会话表。（通用原理）','规则从上往下匹配，命中第一条就停，所以更精确的规则要放在前面。（通用原理）','建议"最小授权"：只放行业务真正需要的流量。'],
  cfg:['security-policy',' rule name trust_to_internet','  source-zone trust','  destination-zone untrust','  source-address 10.1.1.0 24','  action permit'],run:false,note:CFG_NOTE[0]},
session:{tag:'概念',title:'会话表',en:'Session Table',sum:'防火墙为每条放行的连接记一条"会话"：协议、源和目的地址及端口、源和目的安全区域、命中的安全策略、NAT 转换后的地址、剩余老化时间等。',
  pts:['后续报文命中会话就直接转发，不用再逐条匹配安全策略，又快又能自动放行回程流量。','查看命令：display firewall session table [ verbose ]。加 verbose 会显示安全区域、TTL、出接口、命中的策略名、TCP 状态等；NAT 转换后的地址写在方括号里。','排障时如果连会话都没建起来，常见原因是安全策略拒绝了这类流量，或者源地址在黑名单里。'],cfg:['display firewall session table verbose'],run:false,src:[SRC.session]},
nat:{tag:'概念 · 通用原理',title:'NAT 地址转换',en:'Network Address Translation',sum:'内网用的是私网地址（例如 10.x.x.x），去互联网之前，防火墙把源地址换成公网地址，回程时再换回来。转换关系记在会话表里。',
  pts:['源 NAT：内网用户上网，最常见。','NAT Server（目的 NAT）：把 DMZ 里的服务器发布到公网，外部用户访问公网地址，被转到内部服务器。','USG12000 产品页列出的功能包括 NAT 和运营商级 NAT（CGN）。'],src:[SRC.usg12000]},
xLPU:{tag:'单板',title:'接口板 LPU',en:'Line Processing Unit',sum:'提供对外的物理端口，负责收发报文，并把需要做安全处理的流量送到业务处理板。端口直接做在板上。',
  pts:['USG12000 的接口板例如 4×400GE QSFP-DD、18×100GE QSFP28。','AntiDDoS12000 的接口板例如 LPUA-48XS（48×10GE SFP+）、LPUA-4DQ（4×400GE QSFP-DD）。','接口板把流量分给业务板的方式属于通用原理示意。'],src:[SRC.usg12000,SRC.ads],drill:'点击单板查看内部'},
xport:{tag:'接口',title:'固定端口',en:'Fixed Port',sum:'直接做在接口板上的光口，插上光模块和光纤就能用。',pts:['防火墙上，每个业务接口都要加入一个安全区域。','抗 DDoS 设备上，端口分别连接引流和回注的链路。']},
adsChassis:{tag:'整机',title:'抗 DDoS 设备',en:'Anti-DDoS System',sum:'专门对付 DDoS（分布式拒绝服务）攻击的安全设备。攻击者控制大量"肉鸡"同时发流量，把目标打瘫；抗 DDoS 设备负责识别攻击流量、把它清洗掉，再把正常流量送回去。',
  pts:['部署方式有两种：串接在链路中直接清洗；或者旁路部署，平时只检测，发现攻击后才把受害目标的流量"引"过来清洗，再"回注"到原网络。','参考机型 AntiDDoS12000：12004/12008/12016 三个型号，扩展槽分别为 4/8/16 个，都有 2 个主控槽；高度 9.8U/15.8U/32.3U。','单机防护能力：12004 最大 400 Gbps / 300 Mpps，12008 最大 1.2 Tbps / 900 Mpps，12016 最大 2.4 Tbps / 1800 Mpps。','电源和风扇都是 N+1 冗余。','本演示的槽位布局是简化画法，不对应真机。'],
  src:[SRC.ads],drill:'点击单板查看内部，或点左上角「原理演示」看引流和回注'},
adsSPU:{tag:'单板',title:'业务处理板 SPU',en:'Service Processing Unit',sum:'负责检测和清洗的单板。AntiDDoS12000 的 Datasheet 写到，它用 NP 加速、和 CPU 协同处理来提升防护性能。',
  pts:['逐包检测所有流量，支持 60 多种流量模型。','针对三层、四层、七层攻击，做过滤、行为分析和机器学习识别。','Datasheet 列出的业务板有 SPUB-ADS-01/02，还有防护业务卡 SPCB-ADS-01/02。','检测和清洗能力按 License 开通，以 10G 为单位。'],src:[SRC.ads],drill:'点击单板查看内部'},
adsnp:{tag:'芯片',title:'NP 加速芯片',en:'NP Accelerator',sum:'AntiDDoS12000 的 Datasheet 提到"NP 加速 + CPU 协同处理"。一般来说，NP 适合做高速、规则相对简单的逐包过滤，更复杂的分析交给 CPU。',pts:['后半句的分工方式属于通用原理示意。'],src:[SRC.ads]},
detect:{tag:'概念',title:'攻击检测',en:'Attack Detection',sum:'先要知道"有没有被攻击、谁被攻击"。设备持续分析发往被保护对象的流量，发现流量突增或特征异常，就判定为攻击。',
  pts:['逐包检测：把流量复制一份给检测设备，看每一个包，最精确。','xFlow 检测：路由器上报流量采样统计，检测设备据此判断，部署更轻量。','检测到攻击后触发引流。'],src:[SRC.ads],drill:'点左上角的动画按钮，看检测、引流、清洗、回注的全过程'},
divert:{tag:'概念',title:'引流',en:'Traffic Diversion',sum:'把受攻击目标的流量从原来的路径"拐"到清洗设备。常见做法是清洗设备通过 BGP 向路由器发布一条更精确的路由，路由器按最长匹配就会把发往这个目标的流量送过来。',
  pts:['静态引流：用策略路由（PBR）或 BGP，长期把流量引过来。','动态引流：检测到攻击时才通过 BGP 发布引流路由，攻击结束后撤销。'],src:[SRC.ads]},
inject:{tag:'概念',title:'回注',en:'Traffic Injection',sum:'清洗后的正常流量要送回原网络，交给真正的服务器。难点是：如果直接还给路由器，路由器又会按引流路由把它发回清洗设备，形成环路。',
  pts:['所以回注要走一条不会命中引流路由的路。','AntiDDoS12000 Datasheet 列出的回注方式：二层回注、静态路由、策略路由、GRE 隧道、SRv6、MPLS LSP/VPN。'],src:[SRC.ads]},
clean:{tag:'概念 · 通用原理',title:'清洗',en:'Scrubbing',sum:'攻击流量和正常流量混在一起时，把攻击包丢掉，把正常包留下。',pts:['常用手段：特征过滤、源认证（确认对方是真实的客户端）、限速、行为分析等。','清洗要逐包进行，所以需要很强的处理能力。']},
});
Object.assign(KB_EN,{
swChassis:{title:'Chassis Switch',sum:'A high-capacity switch commonly used at the core of campus networks. Like a chassis router, it has MPUs, switch fabric, line cards, power and fans, but its strength is Layer-2 switching: lots of ports, isolation by VLAN, and forwarding by MAC address table. It can also route at Layer 3.',
  pts:['The key difference: a switch mainly forwards by Layer-2 MAC address (within a subnet), while a router forwards by Layer-3 IP address (between subnets). Today\'s core switches do both and are often called "Layer-3 switches".','High port density: a single card often has 48 GE or 10GE ports for connecting many access switches or servers.','Reference model CloudEngine S12700E, Huawei\'s flagship campus core switch. S12700E-4/-8/-12 have 4/8/12 service slots, 2 MPU slots each, 2/4/4 SFU slots, and 2/4/5 fan slots.','S12700E-8: 38.4 Tbit/s switching capacity (hardware-ready for 57.6 Tbit/s) and 28,800 Mpps forwarding; one switch manages 10,240 APs and 50,000+ wireless users.','The slot layout in this demo is simplified and does not match the real device.'],
  drill:'Click a board to look inside, or "How it works" at top left for VLANs and the MAC table'},
swLPU:{title:'Interface Card (Switch)',sum:'On a switch, ports are built right onto the card, with no subcards. When a packet arrives, the forwarding chip looks up the MAC address table (Layer 2) or the FIB (Layer 3) to pick the outgoing port.',pts:['S12700E offers many cards, e.g. 48×GE copper, 48×10GE optical, 40×25GE, 24×100GE.','Traffic between ports on the same card can be forwarded on the card; traffic between cards goes through the switch fabric. (generic principle)','Tables such as the MAC table, FIB and ACLs live on the card. (generic principle)']},
cmu:{title:'Centralized Monitoring Unit (CMU)',sum:'The S12700E hardware description lists it as the "Centralized Monitoring Unit", providing centralized monitoring of the device. It does not forward packets.',pts:['Not every device has a separate monitoring board; the router demo does not show one.']},
swfwd:{title:'Forwarding Chip',sum:'The core chip on a switch line card. For each Ethernet frame it first looks up the MAC table for Layer-2 forwarding; if the destination MAC belongs to the switch\'s own Layer-3 interface (VLANIF), it goes on to look up the FIB for Layer-3 forwarding.',pts:['Layer-2 forwarding does not change the packet; it only chooses the outgoing port.','Layer-3 forwarding works like a router: TTL minus 1 and a new L2 header.']},
swport:{title:'Access & Trunk Ports',sum:'Switch ports are typed by how they handle VLAN tags. An access port usually connects a PC or server and belongs to one VLAN; a trunk port usually connects another switch and carries frames of several VLANs.',pts:['Access port: untagged frames coming in are put into the port\'s VLAN (port default vlan); the tag is removed on the way out.','Trunk port: frames travel with an 802.1Q VLAN tag, so the far end knows which VLAN they belong to.','Huawei switches also have a Hybrid type that lets you choose which VLANs are tagged and which are not.'],note:'Access port commands come from a Huawei configuration example; trunk commands and interface numbers are illustrative.'},
vlan:{title:'VLAN (Virtual LAN)',sum:'Groups switch ports logically; each group is its own broadcast domain. Different VLANs cannot talk at Layer 2, as if they were on separate switches.',pts:['VLAN IDs range from 1 to 4094 and are carried in the frame\'s 802.1Q tag.','Benefits: smaller broadcast domains, separation of departments or services, better security.','To talk between VLANs, traffic must go through Layer 3: a router, or a VLANIF interface on a Layer-3 switch.']},
mactable:{title:'MAC Address Table',sum:'The "address book" a switch uses for Layer-2 forwarding: which MAC address is on which port, in which VLAN.',pts:['Learn: when a frame arrives, record its source MAC and incoming port.','Forward: look up the destination MAC; if found, send only out of that port.','Flood: if not found (or it is a broadcast), send a copy out of every other port in the same VLAN.','Entries age out after a period without traffic, so a device that moves gets learned again.'],drill:'Press the animation button at top left to watch the MAC table being learned entry by entry'},
vlanif:{title:'VLANIF Interface',sum:'A Layer-3 logical interface on a switch, one per VLAN. Give it an IP address and it becomes the gateway for PCs in that VLAN; traffic between VLANs is routed by it.',pts:['A PC\'s default gateway is set to the VLANIF IP address.','This is what lets a "Layer-3 switch" route.']},
fwChassis:{title:'Chassis Firewall',sum:'A security device at the network edge (the exit of data centers, large enterprises and campuses). A router cares about "which way"; a firewall also decides "allowed or not": it checks every connection against security zones and policies and only lets permitted traffic through.',
  pts:['Stateful inspection: the firewall creates a session for every permitted connection. Later packets are forwarded quickly by session lookup, and return traffic is allowed automatically.','Typical features: security policies, NAT, VPN, intrusion prevention, antivirus and other content security.','Reference model HiSecEngine USG12000, which Huawei calls the industry\'s first terabit-level AI firewall. USG12004 is 9.8 U and USG12008 is 15.8 U high; line cards go up to 18×100GE per slot, and there is a 4×400GE card.','Reliability: dual MPU backup, HSB hot standby, NSR and GR; redundant power and pluggable fan modules.','The service processing unit (SPU) and slot layout here are illustrative; the public product page does not give these board details for USG12000.'],
  drill:'Click a board to look inside, or "How it works" at top left for security policies and the session table'},
fwSPU:{title:'Service Processing Unit (SPU)',sum:'The board that does the heavy lifting in a security device: session management, policy matching, NAT and content inspection. Traffic comes in on a line card, is processed on the SPU, and leaves through a line card.',pts:['Security inspection is far more complex than plain forwarding — it looks at the application layer and even file contents — so it needs many CPU cores and lots of memory.','Several SPUs share the load, so performance scales with the number of boards.','This is an illustrative generic principle; the USG12000 public product page does not list specific service board models.']},
spucpu:{title:'Multi-core CPU',sum:'The multi-core CPUs on a service board handle session management, policy matching, content inspection and other heavy computation. The more complex the security service (decryption, antivirus), the more CPU it needs.'},
spumem:{title:'Memory',sum:'Holds the session table, signature databases, buffered packets and more. How many sessions fit decides how many connections the device can handle at once.'},
zone:{title:'Security Zone',sum:'A firewall groups the networks it connects into "zones", each with a security level. Traffic moving between zones is checked by security policies.',pts:['Predefined zones: Untrust (5, low, e.g. the Internet), DMZ (50, medium, servers that serve outside users), Trust (85, high, internal hosts), Local (100, highest, the device itself).','Once an interface joins a zone, the network behind it belongs to that zone; an interface can belong to only one zone.','You can also create zones with your own priority from 1 to 100; a bigger number means more trusted.'],note:CFG_NOTE[1],drill:'Press the animation button at top left to watch packets cross the firewall'},
secpolicy:{title:'Security Policy',sum:'The firewall\'s "door rules": from which zone and address, to which zone and address, which service, permit or deny. Packets are matched against the rules in order; if nothing matches, the default rule denies them.',pts:['Only the first packet of a connection needs a policy check: once it is permitted a session is created, and later and return packets just look up the session table. (generic principle)','Rules are matched top-down and matching stops at the first hit, so more specific rules go first. (generic principle)','Follow "least privilege": only permit the traffic the business really needs.'],note:CFG_NOTE[1]},
session:{title:'Session Table',sum:'For every permitted connection the firewall keeps a "session": protocol, source and destination addresses and ports, source and destination zones, the matched policy, the post-NAT address, remaining aging time and more.',pts:['Later packets that hit a session are forwarded directly without walking the policy list — faster, and return traffic is allowed automatically.','Command: display firewall session table [ verbose ]. With verbose it shows zones, TTL, outgoing interface, matched policy name, TCP state and more; post-NAT addresses appear in square brackets.','When troubleshooting, if no session is created at all, common causes are a security policy denying the traffic or a blacklisted source address.']},
nat:{title:'NAT (Network Address Translation)',sum:'Internal hosts use private addresses (such as 10.x.x.x). Before traffic goes to the Internet the firewall swaps the source address for a public one, and swaps it back on the return path. The mapping is kept in the session table.',pts:['Source NAT: internal users reaching the Internet — the most common case.','NAT Server (destination NAT): publishes a DMZ server on a public address; outside users reach the public address and are sent to the internal server.','The USG12000 product page lists NAT and carrier-grade NAT (CGN) among its features.']},
xLPU:{title:'Line Processing Unit (LPU)',sum:'Provides the external physical ports, sends and receives packets, and hands traffic that needs security processing to the service boards. Ports are built onto the card.',pts:['USG12000 line cards include 4×400GE QSFP-DD and 18×100GE QSFP28.','AntiDDoS12000 line cards include LPUA-48XS (48×10GE SFP+) and LPUA-4DQ (4×400GE QSFP-DD).','How the line card distributes traffic to service boards is an illustrative generic principle.']},
xport:{title:'Fixed Port',sum:'An optical port built directly onto the line card; plug in an optical module and fiber to use it.',pts:['On a firewall, every service interface must join a security zone.','On an anti-DDoS device, ports connect the diversion and injection links.']},
adsChassis:{title:'Anti-DDoS System',sum:'A security device built to fight DDoS (distributed denial of service) attacks, where an attacker uses many compromised machines to flood a target. The anti-DDoS system identifies attack traffic, scrubs it away and sends the clean traffic back.',
  pts:['Two deployments: in-path, scrubbing traffic on the link directly; or off-path, where it normally only detects and, once an attack is found, "diverts" the victim\'s traffic to itself, scrubs it and "injects" it back into the network.','Reference model AntiDDoS12000: models 12004/12008/12016 with 4/8/16 extended slots and 2 MPU slots each; 9.8 U / 15.8 U / 32.3 U high.','Defense capacity per device: 12004 up to 400 Gbps / 300 Mpps, 12008 up to 1.2 Tbps / 900 Mpps, 12016 up to 2.4 Tbps / 1800 Mpps.','Power and fans are both N+1 redundant.','The slot layout in this demo is simplified and does not match the real device.'],
  drill:'Click a board to look inside, or "How it works" at top left for diversion and injection'},
adsSPU:{title:'Service Processing Unit (SPU)',sum:'The board that does detection and scrubbing. The AntiDDoS12000 datasheet says it uses NP acceleration in collaboration with the CPU to boost defense performance.',pts:['Per-packet detection of all traffic, with more than 60 traffic models.','Filtering, behavior analysis and machine learning against Layer 3, 4 and 7 attacks.','The datasheet lists service boards SPUB-ADS-01/02 and protection service cards SPCB-ADS-01/02.','Detection and scrubbing capacity is enabled by license, in units of 10G.']},
adsnp:{title:'NP Accelerator',sum:'The AntiDDoS12000 datasheet mentions "NP acceleration with collaborative CPU processing". In general, an NP is good at fast, fairly simple per-packet filtering, while more complex analysis goes to the CPU.',pts:['The division of work in the second sentence is an illustrative generic principle.']},
detect:{title:'Attack Detection',sum:'First you need to know whether there is an attack and who is the target. The device keeps analyzing traffic to protected targets; a sudden surge or abnormal pattern is judged to be an attack.',pts:['Per-packet detection: a copy of the traffic goes to the detector, which looks at every packet — the most accurate.','xFlow detection: routers report sampled flow statistics and the detector judges from them — lighter to deploy.','Once an attack is detected, diversion is triggered.'],drill:'Press the animation button at top left to see detection, diversion, scrubbing and injection'},
divert:{title:'Traffic Diversion',sum:'Steers the victim\'s traffic off its normal path to the scrubbing device. A common way: the scrubbing device advertises a more specific route to the router via BGP, and by longest match the router sends traffic for that target over.',pts:['Static diversion: PBR or BGP keeps traffic diverted long-term.','Dynamic diversion: the BGP diversion route is advertised only when an attack is detected and withdrawn when it ends.']},
inject:{title:'Traffic Injection',sum:'Clean traffic has to be sent back into the network to reach the real server. The catch: if it is simply handed back to the router, the router follows the diversion route and sends it straight back to the scrubber — a loop.',pts:['So injection must use a path that does not hit the diversion route.','Injection methods listed in the AntiDDoS12000 datasheet: Layer 2, static route, PBR, GRE tunnel, SRv6, MPLS LSP/VPN.']},
clean:{title:'Scrubbing',sum:'With attack and legitimate traffic mixed together, drop the attack packets and keep the legitimate ones.',pts:['Common techniques: signature filtering, source authentication (checking the client is real), rate limiting and behavior analysis.','Scrubbing is done packet by packet, so it needs a lot of processing power.']},
});

function ifKB(name){const i=IF[name];if(!i)return KB.physif;
  const up=phyUp(i),pu=protoUp(i);
  const rows=[['PHY',`<span class="pill ${up?'up':'down'}">${i.kind==='phy'&&!i.admin?'*down':up?'up':'down'}</span>`],['Protocol',`<span class="pill ${pu?'up':'down'}">${pu?'up':'down'}</span>`],[L('IP 地址','IP address'),i.ip?`${i.ip}/${i.len}`:L('未配置','not set')],[L('描述','Description'),i.desc||'—']];
  if(i.kind==='phy')rows.push([L('位置','Location'),L(`${i.slot} 号槽 · ${i.pic} 号子卡 · ${i.port} 号端口`,`slot ${i.slot} · subcard ${i.pic} · port ${i.port}`)],[L('速率','Speed'),i.speed],[L('光模块','Optics'),i.cable?L(`${i.optic} 已插入，光纤已连接`,`${i.optic} inserted, fiber connected`):L('未连接光纤','no fiber')],['MAC',macOf(name)]);
  if(i.kind==='sub')rows.push([L('父接口','Parent'),i.parent],['VLAN',i.vid??L('未配置','not set')]);
  const subs=Object.values(IF).filter(s=>s.parent===name).map(s=>s.name);
  if(subs.length)rows.push([L('子接口','Sub-interfaces'),subs.join('<br>')]);
  const cfg=['system-view',`interface ${name}`];if(i.desc)cfg.push(`description ${i.desc}`);if(i.ip)cfg.push(`ip address ${i.ip} ${len2mask(i.len)}`);cfg.push(i.admin?'undo shutdown':'shutdown','commit','display this');
  let why='';if(i.kind==='phy'){if(!i.admin)why=L('这个接口被 shutdown 了，执行 undo shutdown 即可打开。','This interface is shut down. Run undo shutdown (then commit) to turn it on.');else if(!i.cable)why=L('这个端口没有接光纤，所以 PHY 是 down。','No fiber is connected to this port, so PHY is down.');else if(!i.ip)why=L('物理层已经 up，但没有配置 IP 地址，所以 Protocol 是 down。','The physical layer is up, but there is no IP address, so Protocol is down.')}
  return {tag:L('接口','Interface'),title:name,en:i.kind==='phy'?`${i.speed} Ethernet`:i.kind==='sub'?'Sub-interface':'Logical interface',sum:why||L('接口状态正常，物理层和协议层都已 up。','The interface is healthy: both the physical and protocol layers are up.'),rows,pts:[],cfg,note:L('可以在命令行里修改它，例如 shutdown / undo shutdown、修改 IP，commit 后左侧视图会同步变化。','Change it in the CLI, e.g. shutdown / undo shutdown or a new IP; after commit the view on the left updates.'),
    links:[['ifname',L('接口命名规则','Interface naming')],['physif',L('PHY 和 Protocol 状态','PHY and Protocol status')],['subif',L('子接口','Sub-interfaces')]]}}

/* ============ 视图与状态 ============ */
const svg=document.getElementById('svg'),vp=document.getElementById('vp'),scene=document.getElementById('scene'),fx=document.getElementById('fx');
let view={k:'chassis'},sel=null,xray=false;

let RT=0;
function render(v,{fit=true,animate=true}={}){
  stopFlow();if(v.k==='topo'&&!dv().topo)v={k:'chassis'};const tok=++RT;
  const doit=()=>{if(tok!==RT)return;view=v;scene.innerHTML='';fx.innerHTML='';scene.classList.toggle('xray',xray&&v.k==='chassis');
    ({chassis:drawChassis,board:drawBoard,sub:drawSub,port:drawPort,topo:drawTopo})[v.k](v);
    drawCallouts(v);if(fit)fitView();crumbs();flowButtons();
    document.getElementById('hint').textContent=(LANG==='en'?{chassis:'Scroll or pinch to zoom · drag to pan · click a board, subcard or port to dive in',board:'The board is laid flat so you can see inside · click a chip to learn about it, click a subcard to go deeper',sub:'Click a port to see its interface · yellow is fiber, white is the optical module',port:'Click any block to learn about it · change the interface in the CLI and this view follows after commit',topo:'Press an animation button at top left · click any box to learn about it'}:{chassis:'滚轮或双指缩放 · 拖动平移 · 点击单板、子卡或端口深入查看',board:'单板平放展示，方便观察内部 · 点击芯片看讲解，点击子卡继续深入',sub:'点击端口查看接口 · 黄色的是光纤，白色的是光模块',port:'点击各个方块查看讲解 · 在命令行实验里修改接口，commit 后这里会同步变化',topo:'点左上角的动画按钮播放 · 点击任意方块查看讲解'})[v.k];
    document.getElementById('xray').hidden=v.k!=='chassis';
    if(sel){const e=scene.querySelector(`[data-id="${CSS.escape(sel)}"]`);if(e)e.classList.add('sel')}
    requestAnimationFrame(()=>scene.classList.remove('fade'))};
  if(animate&&scene.childNodes.length){scene.classList.add('fade');setTimeout(doit,200)}else doit();
}
function viewKB(v){if(v.k==='chassis')return[dv().kb];if(v.k==='topo')return[dv().topo];if(v.k==='board')return[skb(slotOf(v.n))];if(v.k==='sub')return[PICS[v.p].kb];return['iface',v.name]}
const slotOf=n=>dv().slots.find(s=>s.n===n);

function crumbs(){const c=document.getElementById('crumbs');c.innerHTML='';const nm=DEV==='router'?sysname:dv().model;const items=[[L(`机框 ${nm}`,`Chassis ${nm}`),{k:'chassis'}]];if(view.k==='topo')items.push([L('原理演示','How it works'),view]);
  if(view.k!=='chassis'&&view.k!=='topo'){const n=view.n??IF[view.name]?.slot;if(n){items.push([L(`${n} 号槽 · ${slotOf(n).type}`,`Slot ${n} · ${slotOf(n).type}`),{k:'board',n}])}}
  if(view.k==='sub'||(view.k==='port'&&IF[view.name]?.kind==='phy')){const i=IF[view.name];const n=view.n??i.slot,p=view.p??i.pic;items.push([L(`${p} 号子卡`,`Subcard ${p}`),{k:'sub',n,p}])}
  if(view.k==='port')items.push([view.name,view]);
  items.forEach(([t,v],idx)=>{if(idx){const s=document.createElement('i');s.textContent='›';c.appendChild(s)}const b=document.createElement('button');b.textContent=t;if(idx<items.length-1)b.onclick=()=>{sel=null;go(v)};c.appendChild(b)});devBar()}

function go(v){render(v);const [k,a]=viewKB(v);showInfo(k,a);}

/* ---------- 机框 ---------- */
const W=560,D=380,H=600,SX=n=>20+(n-1)*52;
const GE_Z=k=>254-k*20, HG_Z=k=>392-k*48;
function drawChassis(){
  tRect(scene,0,-30,-20,W+40,D+70,'shadow');
  const ch=grp(scene,{kb:dv().kb,id:'chassis',tip:L('机框','Chassis')});
  box(ch,{x:0,y:0,z:0,w:W,d:D,h:H,mat:'metal'});
  tText(ch,H,24,40,DEV==='router'?L(`${sysname} · 框式路由器（演示机型）`,`${sysname} · chassis router (demo model)`):L(`${dv().model} · 框式${dv().zh}（简化示意）`,`${dv().model} · chassis ${dv().en.toLowerCase()} (simplified)`),'ink-l',15);
  tText(ch,H,24,64,L('10 个单板槽位 · 4 电源 · 1 风扇框','10 board slots · 4 PSUs · 1 fan tray'),'ink-l',11);
  const xr=el('g',{class:'xr'},scene);
  const bp=grp(xr,{kb:'backplane',id:'backplane',tip:L('背板','Backplane')});
  el('polygon',{class:'backplane',points:pts([[14,34,92],[546,34,92],[546,34,500],[14,34,500]])},bp);
  fText(bp,34,280,520,L('背板 Backplane','Backplane'),'ink-l',13,'middle');
  fRect(ch,D+.5,14,86,546,506,'recess');
  dv().slots.forEach(s=>drawSlot(s));
  for(let i=0;i<4;i++){const x=20+i*131;const g=grp(scene,{kb:'power',id:'pwr'+i,tip:L(`电源模块 PWR${i+1}`,`Power module PWR${i+1}`)});box(g,{x,y:D-2,z:12,w:124,d:8,h:66,mat:'psu'});
    for(let j=0;j<6;j++)fRect(g,D+6.2,x+48+j*11,24,x+53+j*11,66,'grille');fDot(g,D+6.2,x+14,64,3.2,'led on');fText(g,D+6.2,x+10,32,`PWR${i+1}`,'ink-d',10);fRect(g,D+6.2,x+104,26,x+116,62,'handle')}
  const fan=grp(scene,{kb:'fan',id:'fan',tip:L('风扇框','Fan tray')});box(fan,{x:20,y:D-2,z:512,w:520,d:8,h:76,mat:'psu'});
  for(let j=0;j<8;j++)fRect(fan,D+6.2,90,522+j*8,520,525+j*8,'grille');fText(fan,D+6.2,30,556,'FAN','ink-d',12);fDot(fan,D+6.2,40,530,3.2,'led on blink');
}
function drawSlot(s){
  const x0=SX(s.n),Y=D+6,px1=x0+2,px2=x0+50;
  const g=grp(scene,{cls:'slotg type-'+(s.type||'none'),kb:s.type?skb(s):'filler',id:'slot:'+s.n,go:s.type?'board:'+s.n:null,tip:s.type?L(`${s.n} 号槽 · ${kbOf(skb(s)).title}${s.role?'（'+s.role+'）':''}`,`Slot ${s.n} · ${kbOf(skb(s)).title}${s.role?' ('+(s.role==='主用'?'active':'standby')+')':''}`):L(`${s.n} 号槽 · 空（假面板）`,`Slot ${s.n} · empty (filler panel)`)});
  g.classList.add('slide');
  box(g,{x:px1,y:D,z:92,w:48,d:6,h:406,mat:s.type?'panel':'metal'});
  if(!s.type){[110,480].forEach(z=>fDot(g,Y,x0+26,z,3,'screw'));fText(g,Y,x0+26,300,L('空','empty'),'ink-l',11,'middle');return}
  fRect(g,Y,px1+8,484,px2-8,494,'handle');fRect(g,Y,px1+8,96,px2-8,106,'handle');
  fText(g,Y,x0+26,466,String(s.n),'ink-d',14,'middle');fText(g,Y,x0+26,452,s.type,'ink-d',9,'middle');
  fDot(g,Y,px1+12,436,2.6,'led on blink');fDot(g,Y,px1+24,436,2.6,s.type==='MPU'&&s.role==='主用'?'led on':'led');fDot(g,Y,px1+36,436,2.6,'led');
  if(s.type==='LPU'&&DEV==='router'){
    const w1=grp(g,{kb:'pic-100ge',id:`pic:${s.n}:1`,go:`sub:${s.n}:1`,tip:L(`${s.n} 号槽 1 号子卡 · 2×100GE`,`Slot ${s.n} subcard 1 · 2×100GE`)});
    fRect(w1,Y,px1+4,300,px2-4,426,'win');
    for(let k=0;k<2;k++){const name=portIf(s.n,1,k),z=HG_Z(k);const pg=grp(w1,{kb:'port',id:'p:'+name,go:'port:'+name,tip:name});fRect(pg,Y,px1+9,z-14,px2-9,z+14,'hole');fDot(pg,Y,px2-13,z+20,2.2,phyUp(IF[name])?'led on':'led')}
    const w0=grp(g,{kb:'pic-ge',id:`pic:${s.n}:0`,go:`sub:${s.n}:0`,tip:L(`${s.n} 号槽 0 号子卡 · 8×GE`,`Slot ${s.n} subcard 0 · 8×GE`)});
    fRect(w0,Y,px1+4,104,px2-4,284,'win');
    for(let k=0;k<8;k++){const name=portIf(s.n,0,k),z=GE_Z(k);const pg=grp(w0,{kb:'port',id:'p:'+name,go:'port:'+name,tip:name});fRect(pg,Y,px1+9,z-7,px2-16,z+7,'hole');fDot(pg,Y,px2-10,z,2.2,phyUp(IF[name])?'led on':'led')}
  }else if(s.type==='LPU'){
    const w=grp(g,{kb:DEV==='switch'?'swport':'xport',id:'ports:'+s.n,tip:DEV==='switch'?L('48×GE 电口（示意）','48×GE copper ports (illustrative)'):L('100GE / 10GE 光口（示意）','100GE / 10GE optical ports (illustrative)')});fRect(w,Y,px1+4,104,px2-4,426,'win');
    if(DEV==='switch'){for(let r=0;r<14;r++)for(let c=0;c<2;c++)fRect(w,Y,px1+8+c*18,404-r*21,px1+20+c*18,394-r*21,'hole')}
    else{for(let k=0;k<2;k++)fRect(w,Y,px1+9,392-k*44-14,px2-9,392-k*44+14,'hole');for(let k=0;k<8;k++)fRect(w,Y,px1+9,290-k*22,px2-16,280-k*22,'hole')}
  }else if(s.type==='CMU'){
    fText(g,Y,x0+26,410,'CMU','ink-cn',10,'middle');for(let j=0;j<6;j++)fRect(g,Y,px1+10,150+j*18,px2-10,156+j*18,'grille');
  }else if(s.type==='MPU'){
    fText(g,Y,x0+26,410,L(s.role,s.role==='主用'?'Active':'Standby'),'ink-cn',10,'middle');
    const m=grp(g,{kb:'mgmt',id:'mgmt:'+s.n,tip:L('Console / 管理网口 / USB','Console / MGMT ETH / USB')});
    [[360,'CON'],[310,'ETH'],[262,'USB']].forEach(([z,t])=>{fRect(m,Y,px1+10,z-12,px2-10,z+10,'hole');fText(m,Y,x0+26,z-20,t,'ink-d',8,'middle')});
  }else{for(let j=0;j<14;j++)fRect(g,Y,px1+10,150+j*18,px2-10,156+j*18,'grille')}
}

/* ---------- 单板 ---------- */
function drawBoard({n}){
  const s=slotOf(n),T=s.type,K=skb(s),BW=600,BD=400;
  tRect(scene,0,-20,-30,BW+30,BD+60,'shadow');
  const base=grp(scene,{kb:K,id:'board',tip:kbOf(K).title});
  box(base,{x:0,y:0,z:0,w:BW,d:BD,h:8,mat:'pcb'});
  const part=(kb,id,tip,b,extra)=>{const g=grp(scene,{kb,id:'c:'+id,tip});box(g,b);if(extra)extra(g);return g};
  const sink=(g,x,y,w,d,z,n2)=>{for(let i=0;i<n2;i++)box(g,{x:x+i*(w/n2),y,z,w:w/n2*.45,d,h:22,mat:'sink'})};
  // 连接器
  part('conn','conn',L('背板连接器','Backplane connector'),{x:50,y:0,z:8,w:500,d:20,h:40,mat:'conn'});
  if(T==='LPU'&&DEV==='router'){
    line3(scene,[[155,250,8.5],[155,175,8.5],[180,175,8.5]],'trace');line3(scene,[[445,250,8.5],[445,200,8.5],[250,170,8.5]],'trace');
    line3(scene,[[270,120,8.5],[300,125,8.5]],'trace');line3(scene,[[345,90,8.5],[345,20,8.5]],'trace');line3(scene,[[440,90,8.5],[270,100,8.5]],'trace c');line3(scene,[[475,140,8.5],[475,120,8.5]],'trace c');
    part('dcdc','dcdc',L('板载电源','On-board power'),{x:30,y:50,z:8,w:60,d:60,h:16,mat:'chip'});
    part('lcpu','lcpu',L('接口板 CPU','Line card CPU'),{x:440,y:60,z:8,w:70,d:58,h:8,mat:'chip'});
    part('tcam','tcam',L('表项存储 TCAM','Table memory TCAM'),{x:420,y:140,z:8,w:110,d:40,h:6,mat:'chip'});
    part('np','np',L('网络处理器 NP','Network processor NP'),{x:150,y:70,z:8,w:120,d:100,h:10,mat:'chip'},g=>sink(g,152,74,118,92,18,7));
    part('tm','tm',L('流量管理芯片 TM','Traffic manager TM'),{x:300,y:90,z:8,w:90,d:70,h:10,mat:'chip'});
    PICS.forEach(pc=>{const x=pc.p?320:30;const g=part(pc.kb,'pic'+pc.p,L(`${pc.p} 号子卡 · ${pc.name}`,`Subcard ${pc.p} · ${pc.en}`),{x,y:250,z:8,w:250,d:150,h:26,mat:'sub'});g.dataset.go=`sub:${n}:${pc.p}`;
      tText(g,34.1,x+14,280,L(`子卡 ${pc.p}`,`Subcard ${pc.p}`),'ink-cn',14);tText(g,34.1,x+14,300,L(pc.name,pc.en),'ink-cn',10)});
  }else if(T==='LPU'){
    line3(scene,[[210,170,8.5],[210,290,8.5]],'trace');line3(scene,[[270,120,8.5],[420,150,8.5]],'trace');line3(scene,[[440,90,8.5],[270,100,8.5]],'trace c');line3(scene,[[210,70,8.5],[210,20,8.5]],'trace');
    part('dcdc','dcdc',L('板载电源','On-board power'),{x:30,y:50,z:8,w:60,d:60,h:16,mat:'chip'});
    part(DEV==='switch'?'swfwd':'np','fwd',DEV==='switch'?L('转发芯片','Forwarding chip'):L('网络处理器 NP','Network processor NP'),{x:150,y:70,z:8,w:120,d:100,h:10,mat:'chip'},g=>sink(g,152,74,118,92,18,7));
    part('tcam','tcam',L('表项存储','Table memory'),{x:420,y:140,z:8,w:110,d:40,h:6,mat:'chip'});
    part('lcpu','lcpu',L('接口板 CPU','Line card CPU'),{x:440,y:60,z:8,w:70,d:58,h:8,mat:'chip'});
    [70,330].forEach((x,i)=>part('phy','phy'+i,L('PHY / MAC 芯片','PHY / MAC chip'),{x,y:290,z:8,w:180,d:60,h:8,mat:'chip'}));
  }else if(T==='SPU'){
    line3(scene,[[200,200,8.5],[200,20,8.5]],'trace');line3(scene,[[400,200,8.5],[400,20,8.5]],'trace');
    part('dcdc','dcdc',L('板载电源','On-board power'),{x:30,y:50,z:8,w:60,d:60,h:16,mat:'chip'});
    [130,330].forEach((x,i)=>part('spucpu','cpu'+i,L('多核处理器','Multi-core CPU'),{x,y:80,z:8,w:140,d:120,h:10,mat:'chip'},g=>sink(g,x+2,84,136,112,18,8)));
    for(let i=0;i<4;i++)part('spumem','mem'+i,L('大容量内存','Memory'),{x:130+i*24,y:240,z:8,w:12,d:150,h:28,mat:'chip'});
    for(let i=0;i<4;i++)part('spumem','mem'+(i+4),L('大容量内存','Memory'),{x:330+i*24,y:240,z:8,w:12,d:150,h:28,mat:'chip'});
    if(DEV==='ads')part('adsnp','acc',L('NP 加速芯片','NP accelerator'),{x:500,y:240,z:8,w:80,d:80,h:10,mat:'chip'});
  }else if(T==='CMU'){
    part('dcdc','dcdc',L('板载电源','On-board power'),{x:30,y:50,z:8,w:60,d:60,h:16,mat:'chip'});
    part('cmu','cmu',L('监控芯片','Monitoring chip'),{x:240,y:120,z:8,w:120,d:100,h:10,mat:'chip'});
    line3(scene,[[300,120,8.5],[300,20,8.5]],'trace');
  }else if(T==='MPU'){
    line3(scene,[[220,200,8.5],[220,20,8.5]],'trace');line3(scene,[[300,140,8.5],[340,140,8.5]],'trace');
    part('dcdc','dcdc',L('板载电源','On-board power'),{x:30,y:50,z:8,w:60,d:60,h:16,mat:'chip'});
    part('cpu','mpu-cpu',L('主控 CPU','Main CPU'),{x:150,y:80,z:8,w:140,d:120,h:10,mat:'chip'},g=>sink(g,152,84,136,112,18,8));
    scene.lastChild.dataset.kb='MPU';
    for(let i=0;i<4;i++)part('mem','mem'+i,L('内存 DDR','DDR memory'),{x:340+i*22,y:60,z:8,w:10,d:170,h:28,mat:'chip'});
    part('flash','flash',L('存储器 Flash/SSD','Flash / SSD storage'),{x:460,y:80,z:8,w:90,d:50,h:8,mat:'chip'});
    part('clock','clock',L('时钟模块','Clock module'),{x:460,y:160,z:8,w:90,d:60,h:12,mat:'sub'});
    part('mgmt','mgmtblk',L('管理接口','Management ports'),{x:60,y:300,z:8,w:300,d:100,h:20,mat:'cage'});
  }else{
    part('dcdc','dcdc',L('板载电源','On-board power'),{x:30,y:50,z:8,w:60,d:60,h:16,mat:'chip'});
    [120,330].forEach((x,i)=>part('swchip','sw'+i,L('交换芯片','Switch fabric chip'),{x,y:120,z:8,w:150,d:140,h:10,mat:'chip'},g=>sink(g,x+2,124,146,132,18,8)));
    line3(scene,[[195,120,8.5],[195,20,8.5]],'trace');line3(scene,[[405,120,8.5],[405,20,8.5]],'trace');
  }
  // 前面板
  const Y=BD+12,pn=grp(scene,{kb:K,id:'panel',tip:L(`${T} 前面板`,`${T} front panel`)});
  box(pn,{x:0,y:BD,z:0,w:BW,d:12,h:80,mat:'panel'});
  fRect(pn,Y,6,20,18,60,'handle');fRect(pn,Y,BW-18,20,BW-6,60,'handle');
  fDot(pn,Y,30,64,3,'led on blink');fDot(pn,Y,30,48,3,'led');fText(pn,Y,40,22,String(n),'ink-d',12);
  if(T==='LPU'&&DEV==='router'){
    fRect(pn,Y,30,10,282,72,'win');fRect(pn,Y,318,10,572,72,'win');
    for(let k=0;k<8;k++){const name=portIf(n,0,k),x=44+k*29;const pg=grp(scene,{kb:'port',id:'p:'+name,go:'port:'+name,tip:name});fRect(pg,Y+.2,x,26,x+22,44,'hole');fDot(pg,Y+.2,x+11,56,2.4,phyUp(IF[name])?'led on':'led');fText(pg,Y+.2,x+11,16,String(k),'ink-d',8,'middle')}
    for(let k=0;k<2;k++){const name=portIf(n,1,k),x=336+k*118;const pg=grp(scene,{kb:'port',id:'p:'+name,go:'port:'+name,tip:name});fRect(pg,Y+.2,x,22,x+100,52,'hole');fDot(pg,Y+.2,x+50,62,2.6,phyUp(IF[name])?'led on':'led');fText(pg,Y+.2,x+50,14,String(k),'ink-d',8,'middle')}
  }else if(T==='LPU'){
    const pg=grp(scene,{kb:DEV==='switch'?'swport':'xport',id:'fports',tip:DEV==='switch'?L('GE 电口（示意）','GE copper ports (illustrative)'):L('100GE / 10GE 光口（示意）','100GE / 10GE optical ports (illustrative)')});fRect(pg,Y,50,8,BW-30,74,'win');
    if(DEV==='switch'){for(let k=0;k<24;k++)for(let r=0;r<2;r++)fRect(pg,Y+.2,62+k*21,16+r*28,76+k*21,32+r*28,'hole')}
    else{for(let k=0;k<2;k++)fRect(pg,Y+.2,62+k*112,22,162+k*112,54,'hole');for(let k=0;k<8;k++)fRect(pg,Y+.2,300+k*32,28,322+k*32,48,'hole')}
  }else if(T==='MPU'){
    const m=grp(scene,{kb:'mgmt',id:'mgmt',tip:L('Console / 管理网口 / USB','Console / MGMT ETH / USB')});
    [[90,'CONSOLE'],[170,'MGMT ETH'],[250,'USB']].forEach(([x,t])=>{fRect(m,Y+.2,x,28,x+50,58,'hole');fText(m,Y+.2,x+25,18,t,'ink-d',8,'middle')});
    fText(pn,Y+.2,330,40,s.role==='主用'?'ACTIVE ●':'STANDBY','ink-d',11);
  }else{for(let j=0;j<20;j++)fRect(pn,Y,120+j*22,20,128+j*22,60,'grille')}
}

/* ---------- 子卡 ---------- */
function drawSub({n,p}){
  const pc=PICS[p],SW=520,SD=300;
  tRect(scene,0,-20,-30,SW+30,SD+120,'shadow');
  const base=grp(scene,{kb:pc.kb,id:'pic',tip:L(pc.name,pc.en)});box(base,{x:0,y:0,z:0,w:SW,d:SD,h:6,mat:'sub'});
  const c=grp(scene,{kb:'conn',id:'c:pconn',tip:L('子卡连接器（插到接口板上）','Subcard connector (plugs into the line card)')});box(c,{x:120,y:0,z:6,w:280,d:16,h:26,mat:'conn'});
  const ph=grp(scene,{kb:'phy',id:'c:phy',tip:L('PHY / MAC 芯片','PHY / MAC chip')});box(ph,{x:200,y:70,z:6,w:120,d:80,h:10,mat:'chip'});
  line3(scene,[[260,70,6.5],[260,22,6.5]],'trace');
  const ports=[];for(let k=0;k<pc.count;k++){const w=p?160:46,gap=p?60:12,x=p?70+k*(w+gap):20+k*(w+gap);ports.push({k,x,w,name:portIf(n,p,k)})}
  ports.forEach(o=>{line3(scene,[[o.x+o.w/2,210,6.5],[260,150,6.5]],'trace')});
  ports.forEach(o=>{const g=grp(scene,{kb:'port',id:'p:'+o.name+':cage',go:'port:'+o.name,tip:o.name});box(g,{x:o.x,y:210,z:6,w:o.w,d:90,h:p?36:22,mat:'cage'})});
  const Y=SD+10,pn=grp(scene,{kb:pc.kb,id:'ppanel',tip:L('子卡面板','Subcard panel')});box(pn,{x:0,y:SD,z:0,w:SW,d:10,h:84,mat:'panel'});
  ports.forEach(o=>{const i=IF[o.name];const g=grp(scene,{kb:'port',id:'p:'+o.name,go:'port:'+o.name,tip:`${o.name} · ${phyUp(i)?'up':'down'}`});
    const zt=p?48:34,zb=p?10:12;fRect(g,Y+.2,o.x,zb,o.x+o.w,zt,'hole');fDot(g,Y+.2,o.x+o.w/2,zt+10,2.8,phyUp(i)?'led on':'led');fText(g,Y+.2,o.x+o.w/2,zt+26,String(o.k),'ink-d',10,'middle')});
  ports.filter(o=>IF[o.name].cable).forEach(o=>{
    const zb=(p?10:12)+3,zt=(p?48:34)-3,ox=o.x+6,ow=o.w-12;
    const g=grp(scene,{kb:'optic',id:'opt:'+o.name,tip:L(`${pc.kind==='ge'?'SFP':'QSFP28'} 光模块`,`${pc.kind==='ge'?'SFP':'QSFP28'} optical module`)});box(g,{x:ox,y:Y,z:zb,w:ow,d:46,h:zt-zb,mat:'optic'});
    fRect(g,Y+46.2,ox+ow*.3,zb+2,ox+ow*.7,zb+6,'tab-blue');
    const f=grp(scene,{kb:'fiber',id:'fib:'+o.name,tip:L('光纤（LC 接头）','Fiber (LC connector)')});const cx=ox+ow/2,cz=(zb+zt)/2;
    line3(f,[[cx-4,Y+46,cz],[cx-4,Y+90,cz-6],[cx-4,Y+140,-30],[cx-4,Y+200,-70]],'fiber');line3(f,[[cx+4,Y+46,cz],[cx+4,Y+90,cz-6],[cx+4,Y+140,-30],[cx+4,Y+200,-70]],'fiber');
  });
}

/* ---------- 接口（2D） ---------- */
function drawPort({name}){
  const i=IF[name],g=scene;const phys=i.kind==='phy'?i:IF[i.parent]||i;const pname=phys.name;
  const T=(x,y,s,cls,anchor)=>{const t=el('text',{x,y,class:cls,'text-anchor':anchor||'start'},g);t.textContent=s;return t};
  // 命名解码
  const m=pname.match(/^([A-Za-z-]+|100GE)(\d+)\/(\d+)\/(\d+)$/)||[pname,pname,'','',''];
  const segs=[[m[1],L('接口类型','type')],[m[2],L('槽位号','slot')],['/',''],[m[3],L('子卡号','subcard')],['/',''],[m[4],L('端口号','port')]];
  const nameG=grp(g,{kb:'ifname',id:'ifname',tip:L('接口命名规则','Interface naming')});
  el('rect',{x:0,y:0,width:900,height:132,rx:12,class:'d-box'},nameG);
  T(20,28,L('接口名称怎么读','How to read an interface name'),'d-s');
  let x=20,ci=0;segs.forEach(([s,cap])=>{const t=T(x,82,s,'d-big '+(cap?'seg'+(ci):''));if(!cap)t.setAttribute('fill','var(--muted)');const w=t.getComputedTextLength()||s.length*20;
    if(cap){el('path',{d:`M${x} 94 v8 h${w} v-8`,class:'d-line'},nameG);T(x+w/2,120,cap,'d-s','middle');ci++}x+=w+4});
  T(x+24,70,L(`→ ${phys.slot??'-'} 号槽，${phys.pic??'-'} 号子卡，第 ${phys.port??'-'} 个口`,`→ slot ${phys.slot??'-'}, subcard ${phys.pic??'-'}, port ${phys.port??'-'}`),'d-t');
  T(x+24,94,L('点左侧面包屑可以回到对应的板卡','Use the breadcrumbs at top left to go back to the board'),'d-s');
  // 物理部分
  const ph=el('g',{transform:'translate(0,160)'},g);
  el('rect',{x:0,y:0,width:400,height:300,rx:12,class:'d-box'},ph);T(20,28,L('物理层：端口 + 光模块 + 光纤','Physical layer: port + optical module + fiber'),'d-s').parentNode===ph||0;
  ph.appendChild(g.lastChild);
  const pnl=grp(ph,{kb:'port',id:'d-port',tip:L('物理端口','Physical port')});el('rect',{x:60,y:60,width:24,height:200,class:'d-panel'},pnl);el('rect',{x:84,y:120,width:110,height:70,class:'d-cage'},pnl);el('rect',{x:30,y:126,width:54,height:58,class:'hole'},pnl);
  el('text',{x:72,y:282,class:'d-s','text-anchor':'middle'},pnl).textContent=L('面板 / 端口','Panel / port');
  if(phys.cable){const op=grp(ph,{kb:'optic',id:'d-opt',tip:L('光模块','Optical module')});el('rect',{x:-10,y:130,width:170,height:50,rx:4,class:'d-opt'},op);el('rect',{x:-24,y:140,width:16,height:30,class:'tab-blue'},op);
    el('text',{x:140,y:215,class:'d-s','text-anchor':'middle'},op).textContent=L(`${phys.optic} 光模块`,`${phys.optic} module`);
    const fb=grp(ph,{kb:'fiber',id:'d-fib',tip:L('光纤','Fiber')});el('path',{d:'M-24 150 C -80 150 -60 260 -140 270',class:'fiber'},fb);el('path',{d:'M-24 160 C -90 160 -70 270 -150 280',class:'fiber'},fb);
    el('text',{x:-130,y:250,class:'d-s','text-anchor':'middle'},fb).textContent=L('光纤','Fiber');
  }else{el('text',{x:-40,y:160,class:'d-s','text-anchor':'middle'},ph).textContent=L('未接光纤','No fiber')}
  const st=phyUp(phys);el('circle',{cx:240,cy:155,r:7,class:st?'st-up':'st-down'},ph);el('text',{x:256,y:160,class:'d-t'},ph).textContent=`PHY ${phys.kind==='phy'&&!phys.admin?'*down':st?'up':'down'}`;
  el('text',{x:226,y:190,class:'d-s'},ph).textContent=`${phys.speed||''} · ${phys.cable?L('光信号正常','light OK'):L('无光','no light')}`;
  // 逻辑层次
  const lg=el('g',{transform:'translate(440,160)'},g);
  const layer=(y,kb,id,title,sub,ok,cls='')=>{const b=grp(lg,{kb,id,tip:title});el('rect',{x:0,y,width:460,height:58,rx:10,class:'d-box '+cls},b);el('text',{x:16,y:y+24,class:'d-t'},b).textContent=title;el('text',{x:16,y:y+44,class:'d-m'},b).textContent=sub;
    if(ok!=null){el('circle',{cx:438,cy:y+29,r:7,class:ok?'st-up':'st-down'},b)}return b};
  layer(0,'physif','L-phy',L('物理接口 ','Physical interface ')+pname,`PHY ${st?'up':'down'} · ${phys.speed||''}`,st,'l1');
  layer(72,'mac','L-mac',L('数据链路层 · 以太网','Data link layer · Ethernet'),`MAC ${macOf(pname)} · MTU 1500`,st);
  layer(144,'l2l3','L-ip',L('网络层 · IP','Network layer · IP'),phys.ip?`${phys.ip}/${phys.len} · Protocol ${protoUp(phys)?'up':'down'}`:L('未配置 IP · Protocol down','No IP · Protocol down'),protoUp(phys));
  [36,108].forEach(y=>el('path',{d:`M230 ${y+22} v14`,class:'d-arrow'},lg));
  const subs=Object.values(IF).filter(s=>s.parent===pname);
  let sy=230;el('text',{x:0,y:sy,class:'d-s'},lg).textContent=subs.length?L('子接口（按 VLAN 拆分出的逻辑接口）','Sub-interfaces (logical interfaces split by VLAN)'):L('还没有子接口，可在命令行里创建','No sub-interfaces yet — create one in the CLI');
  subs.forEach((s,idx)=>{const b=grp(lg,{kb:'subif',id:'sub:'+s.name,go:'port:'+s.name,tip:s.name});const y=sy+12+idx*50;el('rect',{x:0,y,width:340,height:40,rx:8,class:'d-box'+(s.name===name?' l1':'')},b);
    el('text',{x:12,y:y+25,class:'d-m'},b).textContent=`${s.name.replace(/^GigabitEthernet/,'GE')}  VLAN ${s.vid??'-'}  ${s.ip?s.ip+'/'+s.len:''}`;el('circle',{cx:326,cy:y+20,r:6,class:protoUp(s)?'st-up':'st-down'},b);
    const v=grp(lg,{kb:'vpnpre',id:'vpn'+idx,tip:L('绑定 VPN 实例（L3VPN 课程）','Bind a VPN instance (L3VPN lesson)')});el('rect',{x:352,y,width:108,height:40,rx:8,class:'d-box ghost'},v);el('text',{x:406,y:y+25,class:'d-s','text-anchor':'middle'},v).textContent=L('→ VPN 实例','→ VPN instance');});
  // 逻辑接口
  const by=Math.max(500,160+sy+20+subs.length*50);const lo=el('g',{transform:`translate(0,${by})`},g);
  el('text',{x:0,y:0,class:'d-s'},lo).textContent=L('逻辑接口：不对应任何物理端口，由软件创建','Logical interfaces: no physical port behind them, created in software');
  [['loopback','LoopBack0',IF.LoopBack0?.ip?'1.1.1.1/32':''],['trunk','Eth-Trunk1',L('聚合 2 条链路','bundles 2 links')],['tunnel','Tunnel1',L('隧道（后续课程）','tunnel (later lesson)')],['null0','NULL0',L('黑洞接口','black hole')]].forEach(([kb,t,s],idx)=>{
    const b=grp(lo,{kb,id:'lg:'+kb,tip:t});const x=idx*228;el('rect',{x,y:14,width:212,height:58,rx:10,class:'d-box'},b);el('text',{x:x+14,y:38,class:'d-m'},b).textContent=t;el('text',{x:x+14,y:58,class:'d-s'},b).textContent=s});
}

/* ---------- 原理演示（2D）：交换机 / 防火墙 / 抗 DDoS ---------- */
const T2=(par,x,y,s,cls='d-s',anchor='start')=>{const t=el('text',{x,y,class:cls,'text-anchor':anchor},par);t.textContent=s;return t};
function tNode(id,kb,x,y,w,h,title,sub,cls=''){const g=grp(scene,{kb,id,tip:title});el('rect',{x:x-w/2,y:y-h/2,width:w,height:h,rx:10,class:'d-box '+cls},g);T2(g,x,sub?y-3:y+5,title,'d-t','middle');if(sub)T2(g,x,y+17,sub,'d-s','middle');return g}
const tLink=(pts2,cls='')=>el('polyline',{points:pts2.map(p=>p.join(',')).join(' '),class:'t-link '+cls},scene);
function later(e,fi,si){e.dataset.show=fi+':'+si;e.classList.add('later');return e}
function tDrop(x,y,fi,si){const t=el('text',{x,y,class:'t-drop','text-anchor':'middle'},scene);t.textContent='✕';return later(t,fi,si)}
function tTable(kb,id,x,y,w,title,cols,rows){const g=grp(scene,{kb,id,tip:title});const rh=24,h=36+rh*(rows.length+1);
  el('rect',{x,y,width:w,height:h,rx:8,class:'d-box'},g);T2(g,x+12,y+22,title,'d-t');
  let cx=x+12;cols.forEach(([c,cw])=>{T2(g,cx,y+50,c,'d-s');cx+=cw});
  rows.forEach((r,i)=>{const ry=y+36+rh*(i+1);const rg=el('g',{},g);el('rect',{x:x+6,y:ry-2,width:w-12,height:rh-2,rx:4,class:'t-row'},rg);let rx=x+12;r.cells.forEach((c,j)=>{T2(rg,rx,ry+15,c,'d-m t-sm');rx+=cols[j][1]});if(r.show)later(rg,...r.show)});return g}

/* 交换机：A、B、D 在 VLAN 10，C 在 VLAN 20 */
const SWT={A:[150,500],B:[370,500],C:[590,500],D:[810,500],P:{A:[400,330],B:[460,330],C:[540,330],D:[600,330]},IF:[500,250]};
function topoSwitch(){
  const sw=grp(scene,{kb:'swChassis',id:'t-sw',tip:'S12700E'});el('rect',{x:330,y:170,width:340,height:160,rx:14,class:'d-box l1'},sw);
  T2(sw,346,196,L('核心交换机 S12700E','Core switch S12700E'),'d-t');
  tNode('t-vlanif','vlanif',SWT.IF[0],SWT.IF[1],230,58,'VLANIF10 · VLANIF20',L('三层网关 192.168.10.1 / 20.1','L3 gateways 192.168.10.1 / 20.1'));
  const hosts=[['A','10','192.168.10.10','GE1/0/1'],['B','10','192.168.10.20','GE1/0/2'],['C','20','192.168.20.30','GE1/0/3'],['D','10','192.168.10.40','GE1/0/4']];
  hosts.forEach(([h,v,ip,port])=>{const [x,y]=SWT[h],p=SWT.P[h];tLink([[x,y-32],[x,420],[p[0],420],p],'t-v'+v);
    const pg=grp(scene,{kb:'swport',id:'t-p'+h,tip:`${port} · Access · VLAN ${v}`});el('rect',{x:p[0]-14,y:p[1]-8,width:28,height:16,rx:3,class:'d-box v'+v},pg);T2(pg,p[0],p[1]+28,port,'d-s t-sm','middle');
    tNode('t-'+h,'vlan',x,y,150,62,L(`主机 ${h} · VLAN ${v}`,`Host ${h} · VLAN ${v}`),`${ip} · MAC-${h}`,'v'+v)});
  const lg=grp(scene,{kb:'vlan',id:'t-legend',tip:'VLAN'});el('rect',{x:20,y:40,width:16,height:16,rx:3,class:'d-box v10'},lg);T2(lg,44,53,'VLAN 10','d-s');el('rect',{x:120,y:40,width:16,height:16,rx:3,class:'d-box v20'},lg);T2(lg,144,53,'VLAN 20','d-s');
  tTable('mactable','t-mac',720,30,270,L('MAC 地址表','MAC address table'),[['MAC',80],['VLAN',60],[L('端口','Port'),90]],[{cells:['MAC-A','10','GE1/0/1'],show:[0,1]},{cells:['MAC-B','10','GE1/0/2'],show:[0,4]}]);
  tDrop(SWT.D[0]+90,SWT.D[1]+8,0,3)}
function topoSwitchFlows(){const A=SWT.A,B=SWT.B,C=SWT.C,D=SWT.D,P=SWT.P,up=(h)=>[[SWT[h][0],SWT[h][1]-32],[SWT[h][0],420],[P[h][0],420],P[h]],dn=h=>up(h).slice().reverse(),mid=[500,300];
  return [
  {name:L('MAC 地址学习与转发','MAC learning and forwarding'),color:DATA,foot:L('学习看源 MAC，转发看目的 MAC；查不到就在本 VLAN 内泛洪。','Learn from the source MAC, forward by the destination MAC; unknown destinations are flooded within the VLAN.'),steps:[
    {t:L('主机 A 给 B 发一个帧：源 MAC-A，目的 MAC-B，从 GE1/0/1 进入交换机','Host A sends a frame to B: source MAC-A, destination MAC-B, entering on GE1/0/1'),hl:['t-A'],paths:[up('A')]},
    {t:L('学习：交换机记下"MAC-A 在 GE1/0/1、VLAN 10"','Learn: the switch records "MAC-A is on GE1/0/1, VLAN 10"'),hl:['t-mac'],pulse:P.A,dur:1800},
    {t:L('查表找不到 MAC-B，于是在 VLAN 10 的其他端口泛洪：B 和 D 都收到，VLAN 20 的 C 收不到','MAC-B is not in the table, so the frame is flooded to the other VLAN 10 ports: B and D get it, C in VLAN 20 does not'),hl:['t-B','t-D'],paths:[[P.A,mid,...dn('B')],[P.A,mid,...dn('D')]]},
    {t:L('D 发现目的 MAC 不是自己，直接丢弃；B 收下后回复 A','D sees the frame is not for it and drops it; B accepts it and replies to A'),hl:['t-B'],paths:[up('B')]},
    {t:L('学习：交换机又记下"MAC-B 在 GE1/0/2、VLAN 10"','Learn: the switch now records "MAC-B is on GE1/0/2, VLAN 10"'),hl:['t-mac'],pulse:P.B,dur:1800},
    {t:L('这次查得到 MAC-A 在 GE1/0/1，只从这一个口发出，不再泛洪','This time MAC-A is found on GE1/0/1, so the frame goes out that one port only — no flooding'),hl:['t-A'],paths:[[P.B,mid,...dn('A')]]}]},
  {name:L('跨 VLAN 通信：VLANIF 做三层转发','Between VLANs: VLANIF routes at Layer 3'),color:CTRL,foot:L('同一 VLAN 内走二层，跨 VLAN 必须经过三层网关。','Within a VLAN, Layer 2 is enough; between VLANs, traffic must go through a Layer-3 gateway.'),steps:[
    {t:L('A（192.168.10.10）要访问 C（192.168.20.30）。不在同一网段，A 把报文发给网关 192.168.10.1，目的 MAC 是 VLANIF10 的 MAC','A (192.168.10.10) wants to reach C (192.168.20.30). Different subnet, so A sends to its gateway 192.168.10.1, using VLANIF10\'s MAC as the destination'),hl:['t-A','t-vlanif'],paths:[[...up('A'),[P.A[0],SWT.IF[1]+29]]]},
    {t:L('目的 MAC 是交换机自己，交给三层处理：查 FIB，192.168.20.0/24 是 VLANIF20 的直连网段','The destination MAC is the switch\'s own, so Layer 3 takes over: the FIB says 192.168.20.0/24 is directly connected on VLANIF20'),hl:['t-vlanif'],pulse:SWT.IF,dur:2000},
    {t:L('重写二层头（源 MAC 换成 VLANIF20 的 MAC），在 VLAN 20 里发给 C','The L2 header is rewritten (source MAC becomes VLANIF20\'s) and the packet is sent to C in VLAN 20'),hl:['t-C'],paths:[[[P.C[0],SWT.IF[1]+29],...dn('C')]]}]}]}

/* 防火墙：Trust / Untrust / DMZ */
const FWT={pc:[160,300],web:[840,300],dmz:[160,486],in:[380,300],out:[620,300],fw:[500,300]};
function topoFw(){
  [['trust',20,150,280,260,'Trust · 85'],['untrust',700,150,280,260,'Untrust · 5'],['dmz',20,426,280,110,'DMZ · 50']].forEach(([id,x,y,w,h,t])=>{const g=grp(scene,{kb:'zone',id:'z-'+id,tip:L('安全区域 ','Security zone ')+t});el('rect',{x,y,width:w,height:h,rx:14,class:'d-box zone'},g);T2(g,x+14,y+24,t,'d-t')});
  const fw=grp(scene,{kb:'fwChassis',id:'t-fw',tip:'USG12000'});el('rect',{x:380,y:220,width:240,height:160,rx:14,class:'d-box l1'},fw);T2(fw,500,250,L('防火墙 USG12000','Firewall USG12000'),'d-t','middle');
  tNode('t-nat','nat',500,326,160,44,'NAT',L('10.1.1.10 → 198.51.100.1','10.1.1.10 → 198.51.100.1'));later(scene.lastChild,0,2);
  tLink([FWT.pc,FWT.in]);tLink([FWT.out,FWT.web]);tLink([[500,380],[500,418],[160,418],[160,458]]);
  tNode('t-pc','zone',FWT.pc[0],FWT.pc[1],170,62,L('内网 PC','Internal PC'),'10.1.1.10');
  tNode('t-web','zone',FWT.web[0],FWT.web[1],180,62,L('互联网服务器','Internet server'),'203.0.113.10');
  tNode('t-dmz','zone',FWT.dmz[0],FWT.dmz[1],180,56,L('DMZ 服务器','DMZ server'),'172.16.1.10');
  tTable('secpolicy','t-pol',260,20,480,L('安全策略（从上往下匹配）','Security policies (matched top-down)'),[[L('规则','Rule'),170],[L('区域','Zones'),150],[L('动作','Action'),100]],[{cells:['trust_to_internet','trust → untrust','permit'],},{cells:['default','any → any','deny']}]);
  tTable('session','t-sess',318,426,720,L('会话表','Session table'),[[L('协议','Proto'),70],[L('源 → 目的（方括号内是 NAT 后地址）','Source → destination (post-NAT in brackets)'),375],[L('区域','Zones'),120],[L('策略','Policy'),100]],[{cells:['tcp','10.1.1.10:51000[198.51.100.1:2048] → 203.0.113.10:443','trust→untrust','trust_to_internet'],show:[0,2]}]);
  tDrop(FWT.out[0]+22,FWT.out[1]-14,1,1)}
function topoFwFlows(){const pc=FWT.pc,web=FWT.web,i=FWT.in,o=FWT.out;return [
  {name:L('首包查策略，后续包查会话','First packet checks policy, later packets hit the session'),color:DATA,foot:L('安全策略只管首包；状态检测让回程流量自动放行。','Security policy only checks the first packet; stateful inspection lets return traffic through automatically.'),steps:[
    {t:L('内网 PC 访问互联网网站，首包（TCP SYN）从 Trust 区域的接口进入防火墙','The internal PC opens a website; the first packet (TCP SYN) enters through the Trust-zone interface'),hl:['t-pc'],paths:[[[pc[0]+85,pc[1]],i]]},
    {t:L('查会话表：没有这条连接。按顺序匹配安全策略，命中 trust_to_internet，动作 permit','Session table: no match. Policies are checked in order; trust_to_internet matches, action permit'),hl:['t-pol'],pulse:FWT.fw,dur:2200},
    {t:L('做源 NAT：10.1.1.10 换成公网地址 198.51.100.1；建立会话，记下区域、策略和地址转换关系','Source NAT: 10.1.1.10 becomes the public address 198.51.100.1; a session is created recording zones, policy and the translation'),hl:['t-sess','t-nat'],pulse:[500,326],dur:2200},
    {t:L('报文从 Untrust 区域的接口发往服务器','The packet leaves through the Untrust-zone interface toward the server'),hl:['t-web'],paths:[[o,[web[0]-90,web[1]]]]},
    {t:L('服务器回包进入防火墙。注意：并没有 Untrust → Trust 的放行策略','The server\'s reply enters the firewall. Note: there is no policy permitting Untrust → Trust'),hl:['t-fw'],paths:[[[web[0]-90,web[1]+10],[o[0],o[1]+10]]]},
    {t:L('回包命中会话表，直接放行，并把目的地址换回 10.1.1.10。后续报文也都查会话表，不再逐条匹配策略','The reply hits the session and is let through, with the destination translated back to 10.1.1.10. Later packets also just hit the session'),hl:['t-pc','t-sess'],paths:[[[i[0],i[1]+10],[pc[0]+85,pc[1]+10]]]}]},
  {name:L('没被放行的流量会被拦截','Traffic that is not permitted is blocked'),color:CTRL,foot:L('默认拒绝：没被明确允许的流量过不去。','Default deny: anything not explicitly permitted is dropped.'),steps:[
    {t:L('互联网上的主机主动访问内网 PC，报文从 Untrust 接口进入','A host on the Internet tries to reach the internal PC; the packet arrives on the Untrust interface'),hl:['t-web'],paths:[[[web[0]-90,web[1]],o]]},
    {t:L('没有匹配的会话；安全策略里没有 Untrust → Trust 的放行规则，命中默认规则 deny，报文被丢弃','No matching session, and no policy permits Untrust → Trust, so the default deny rule drops the packet'),hl:['t-pol'],pulse:FWT.out,dur:2400}]}]}

/* 抗 DDoS：旁路部署 */
const ADT={net:[130,260],rt:[470,260],srv:[840,260],ads:[470,500]};
function topoAds(){
  tLink([[230,260],[385,260]]);tLink([[555,260],[740,260]]);
  tLink([[420,291],[420,467]]);tLink([[520,291],[520,467]]);tLink([[470,291],[470,467]],'dash');
  tNode('t-net','detect',ADT.net[0],ADT.net[1],200,84,L('互联网','Internet'),L('正常用户 + 攻击者（僵尸网络）','users + attackers (botnet)'));
  tNode('t-rt','divert',ADT.rt[0],ADT.rt[1],170,62,L('出口路由器','Edge router'),'');
  tNode('t-srv','detect',ADT.srv[0],ADT.srv[1],200,62,L('被保护的服务器','Protected server'),'203.0.113.80');
  tNode('t-ads','adsChassis',ADT.ads[0],ADT.ads[1],230,66,'AntiDDoS12000',L('旁路部署','off-path'));
  [[372,390,L('引流','Divert'),'divert'],[568,390,L('回注','Inject'),'inject'],[470,410,L('检测','Detect'),'detect']].forEach(([x,y,t,kb])=>{const g=grp(scene,{kb,id:'t-l-'+kb,tip:t});T2(g,x,y,t,'d-s','middle')});
  const r=grp(scene,{kb:'divert',id:'t-route',tip:L('引流路由','Diversion route')});el('rect',{x:560,y:160,width:250,height:40,rx:8,class:'d-box l1'},r);T2(r,685,185,'203.0.113.80/32 → AntiDDoS','d-m t-sm','middle');later(r,1,2);
  const cl=grp(scene,{kb:'clean',id:'t-clean',tip:L('清洗','Scrubbing')});T2(cl,470,575,L('清洗：丢弃攻击报文','Scrub: drop attack packets'),'d-s','middle');later(cl,1,4);
  tDrop(330,520,1,4)}
function topoAdsFlows(){const n=[230,260],r=[385,260],r2=[555,260],s=[740,260];return [
  {name:L('平时：流量直达，只做检测','Normally: traffic goes direct, detection only'),color:DATA,foot:L('旁路部署时，没有攻击，抗 DDoS 设备就不在业务路径上。','Off-path, the anti-DDoS system is not on the traffic path while there is no attack.'),steps:[
    {t:L('正常用户访问服务器，流量经过出口路由器直接到达','Users reach the server directly through the edge router'),hl:['t-srv'],paths:[[n,r,r2,s]]},
    {t:L('路由器把流量复制一份（或上报 xFlow 统计）给抗 DDoS 设备做检测，业务流量本身不绕路','The router copies the traffic (or reports xFlow statistics) to the anti-DDoS system for detection; the traffic itself takes no detour'),hl:['t-ads'],paths:[[[470,291],[470,467]]]}]},
  {name:L('受攻击时：检测 → 引流 → 清洗 → 回注','Under attack: detect → divert → scrub → inject'),color:CTRL,foot:L('攻击结束后撤销引流路由，流量恢复直达。','When the attack ends, the diversion route is withdrawn and traffic goes direct again.'),steps:[
    {t:L('大量攻击流量混着正常流量涌向服务器','Massive attack traffic, mixed with normal traffic, floods toward the server'),hl:['t-net','t-srv'],paths:[[n,r,r2,s],[[230,250],[385,250],[555,250],[740,250]]]},
    {t:L('检测发现发往 203.0.113.80 的流量异常，判定为 DDoS 攻击','Detection sees abnormal traffic to 203.0.113.80 and flags a DDoS attack'),hl:['t-ads'],pulse:ADT.ads,dur:2000},
    {t:L('抗 DDoS 设备通过 BGP 向路由器发布 203.0.113.80/32 的引流路由，比原有路由更精确','The anti-DDoS system advertises a 203.0.113.80/32 diversion route to the router via BGP — more specific than the existing route'),hl:['t-rt','t-route'],paths:[[[470,467],[470,291]]]},
    {t:L('路由器按最长匹配，把去往服务器的流量都送到抗 DDoS 设备','By longest match, the router now sends all traffic for the server to the anti-DDoS system'),hl:['t-ads'],paths:[[n,r,[420,291],[420,467]]]},
    {t:L('清洗：丢弃攻击报文，留下正常用户的报文','Scrubbing: attack packets are dropped, legitimate packets are kept'),hl:['t-ads','t-clean'],pulse:ADT.ads,dur:2200},
    {t:L('正常流量走回注链路（例如 GRE 隧道或策略路由）回到网络，最终到达服务器。回注不能再命中引流路由，否则会绕回来形成环路','Clean traffic returns over the injection link (e.g. GRE tunnel or PBR) and reaches the server. Injection must not hit the diversion route again, or it would loop'),hl:['t-srv'],paths:[[[520,467],[520,291],r2,s]]}]}]}
function drawTopo(){({switch:topoSwitch,fw:topoFw,ads:topoAds})[DEV]()}
function topoFlows(){return ({switch:topoSwitchFlows,fw:topoFwFlows,ads:topoAdsFlows})[DEV]()}

/* 其他设备在机框上的报文动画（通用原理示意） */
function devChassisFlows(){const s=n=>SX(n)+26,Dn=D+6,z=200,BP=40,IN=D-60;
  const enter=n=>[[s(n),D+110,z],[s(n),Dn,z],[s(n),IN,z]],via=(a,b)=>[[s(a),IN,z],[s(a),BP,z],[s(7),BP,z],[s(b),BP,z],[s(b),IN,z]],leave=n=>[[s(n),IN,z],[s(n),Dn,z],[s(n),D+120,z]];
  if(DEV==='switch')return [{name:L('跨板二层转发','Layer-2 forwarding across cards'),color:DATA,foot:L('板内端口之间可以直接转发，跨板才经过交换网板。（通用原理示意）','Ports on the same card can forward on-card; only cross-card traffic uses the fabric. (generic principle)'),steps:[
    {t:L('以太网帧从 1 号槽接口板进入','An Ethernet frame enters on the slot 1 interface card'),hl:['slot:1'],paths:[enter(1)]},
    {t:L('转发芯片查 MAC 地址表：目的 MAC 在 3 号槽的某个端口','The forwarding chip looks up the MAC table: the destination MAC is on a port in slot 3'),hl:['slot:1'],pulse:[s(1),IN,z],dur:1800},
    {t:L('经背板和交换网板送到 3 号槽','It travels over the backplane and switch fabric to slot 3'),hl:['slot:7','backplane'],paths:[via(1,3)]},
    {t:L('从 3 号槽对应的端口发出','It leaves through the matching port in slot 3'),hl:['slot:3'],paths:[leave(3)]}]}];
  const sp=DEV==='fw'?L('业务板检查会话表和安全策略，必要时做 NAT 和内容检测','The service board checks the session table and security policy, and applies NAT and content inspection if needed'):L('业务板逐包检测并清洗，丢弃攻击报文','The service board inspects each packet and scrubs out attack packets');
  return [{name:DEV==='fw'?L('流量穿过防火墙','Traffic through the firewall'):L('引流过来的流量被清洗','Diverted traffic gets scrubbed'),color:DEV==='fw'?DATA:CTRL,foot:L('接口板负责收发，业务板负责安全处理。（通用原理示意）','Line cards send and receive; service boards do the security work. (generic principle)'),steps:[
    {t:L('流量从 1 号槽接口板进入','Traffic enters on the slot 1 line card'),hl:['slot:1'],paths:[enter(1)]},
    {t:L('接口板把它经交换网板送到 3 号槽的业务处理板','The line card sends it through the switch fabric to the service board in slot 3'),hl:['slot:7','slot:3'],paths:[via(1,3)]},
    {t:sp,hl:['slot:3'],pulse:[s(3),IN,z],dur:2200},
    {t:L('处理后的流量经交换网板回到 2 号槽接口板','The processed traffic goes back through the fabric to the slot 2 line card'),hl:['slot:2'],paths:[via(3,2)]},
    {t:DEV==='fw'?L('从出接口发出','It leaves through the outgoing interface'):L('从回注链路送回网络','It is injected back into the network'),hl:['slot:2'],paths:[leave(2)]}]}]}

/* ============ 引线标注（解剖图谱等风格显示） ============ */
const CALLOUTS={
  xLPU:()=>[['c:fwd'],['c:tcam'],['c:lcpu'],['c:phy0'],['c:conn'],['c:dcdc'],['fports']],
  SPU:()=>[['c:cpu0'],['c:cpu1'],['c:mem0'],['c:mem4'],['c:acc'],['c:conn'],['c:dcdc']],
  CMU:()=>[['c:cmu'],['c:conn'],['c:dcdc']],
  chassis:()=>[['chassis',L('机框','Chassis')],['fan'],['slot:1'],['slot:5'],['slot:6',L('主控板（备用）','MPU (standby)')],['slot:7'],['slot:10'],['pwr0']],
  LPU:()=>[['c:np'],['c:tm'],['c:tcam'],['c:lcpu'],['c:conn'],['c:dcdc'],['c:pic0',L('子卡 0 · 8×GE','Subcard 0 · 8×GE')],['c:pic1',L('子卡 1 · 2×100GE','Subcard 1 · 2×100GE')],['panel',L('前面板','Front panel')]],
  MPU:()=>[['c:mpu-cpu',L('主控 CPU','Main CPU')],['c:mem0'],['c:flash'],['c:clock'],['c:conn'],['c:dcdc'],['mgmt']],
  SFU:()=>[['c:sw0'],['c:sw1'],['c:conn'],['c:dcdc'],['panel',L('前面板','Front panel')]],
  sub:v=>{const LL=[['c:phy'],['c:pconn',L('子卡连接器','Subcard connector')],['ppanel',L('子卡面板','Subcard panel')]];const c=Object.values(IF).find(i=>i.slot===v.n&&i.pic===v.p&&i.cable);if(c)LL.push(['opt:'+c.name],['fib:'+c.name]);LL.push([`p:${portIf(v.n,v.p,PICS[v.p].count-1)}:cage`,L('端口笼子','Port cage')]);return LL}};
const CIRC='①②③④⑤⑥⑦⑧⑨⑩';
function drawCallouts(v){const bs=v.k==='board'&&slotOf(v.n);const key=v.k==='chassis'?'chassis':bs?(bs.type==='LPU'&&DEV!=='router'?'xLPU':bs.type):v.k==='sub'?'sub':null;if(!key||!CALLOUTS[key])return;
  const sb=scene.getBBox(),cx=sb.x+sb.width/2,g=el('g',{class:'callouts'},scene);
  const items=CALLOUTS[key](v).map(([id,lab])=>{const e=scene.querySelector(`[data-id="${CSS.escape(id)}"]`);if(!e)return null;const b=e.getBBox();const k=KB[e.dataset.kb]||{};
    return {id,ax:b.x+b.width/2,ay:b.y+b.height/2,kb:e.dataset.kb,lab:lab||(LANG==='en'?(KB_EN[e.dataset.kb]||{}).title:k.title)||id,en:(LANG==='en'?k.title:k.en)||''}}).filter(Boolean);
  const gap=Math.max(36,sb.height/11);let num=0;
  [['L',items.filter(i=>i.ax<cx)],['R',items.filter(i=>i.ax>=cx)]].forEach(([side,arr])=>{arr.sort((a,b)=>a.ay-b.ay);let prev=-1e9;
    const x0=side==='L'?sb.x-sb.width*.12:sb.x+sb.width*1.12;
    arr.forEach(i=>{const y=Math.max(i.ay,prev+gap);prev=y;const n=CIRC[num++]||'•';
      const c=grp(g,{kb:i.kb,id:'co:'+i.id,tip:i.lab});const ex=side==='L'?x0+28:x0-28;
      el('path',{d:`M${i.ax} ${i.ay} L${ex} ${y} L${x0} ${y}`,class:'co-line'},c);el('circle',{cx:i.ax,cy:i.ay,r:3,class:'co-dot'},c);
      const t=el('text',{x:side==='L'?x0-6:x0+6,y:y+5,class:'co-t','text-anchor':side==='L'?'end':'start'},c);t.textContent=`${n} ${i.lab}`;
      if(i.en){const e2=el('text',{x:side==='L'?x0-6:x0+6,y:y+21,class:'co-e','text-anchor':side==='L'?'end':'start'},c);e2.textContent=i.en}})})}

/* ============ 适配视图 / 缩放平移 ============ */
let vt={k:1,x:0,y:0};const applyVT=()=>vp.setAttribute('transform',`translate(${vt.x},${vt.y}) scale(${vt.k})`);
function fitView(){vt={k:1,x:0,y:0};applyVT();const b=scene.getBBox();const r=svg.getBoundingClientRect();if(!r.width||!r.height||!b.width)return;
  /* 给左上角的按钮区和底部字幕留出位置，让图形落在空白区域里 */
  const ov=document.querySelector('.ovl').getBoundingClientRect(),narrow=r.width<600;
  const top=Math.min(r.height*.45,Math.max(0,ov.bottom-r.top)+14),bot=view.k==='topo'?(narrow?100:130):44,side=narrow?14:58;
  const aw=r.width-side*2,ah=Math.max(80,r.height-top-bot),k=Math.min(aw/b.width,ah/b.height);
  const x0=b.x-side/k-(aw/k-b.width)/2,y0=b.y-top/k-(ah/k-b.height)/2;
  svg.setAttribute('viewBox',`${x0} ${y0} ${r.width/k} ${r.height/k}`)}
function svgPt(cx,cy){const p=svg.createSVGPoint();p.x=cx;p.y=cy;return p.matrixTransform(svg.getScreenCTM().inverse())}
function zoomAt(f,cx,cy){const p=svgPt(cx,cy);const k=Math.min(8,Math.max(.4,vt.k*f));f=k/vt.k;vt.x=p.x-(p.x-vt.x)*f;vt.y=p.y-(p.y-vt.y)*f;vt.k=k;applyVT()}
svg.addEventListener('wheel',e=>{e.preventDefault();zoomAt(Math.exp(-e.deltaY*.0015),e.clientX,e.clientY)},{passive:false});
const ptrs=new Map();let moved=0,last=null,pinch=null;
svg.addEventListener('pointerdown',e=>{svg.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=0;last=svgPt(e.clientX,e.clientY);
  if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)}}svg.classList.add('grabbing')});
svg.addEventListener('pointermove',e=>{
  if(!ptrs.has(e.pointerId)){hoverTip(e);return}
  const prev=ptrs.get(e.pointerId);moved+=Math.abs(e.clientX-prev.x)+Math.abs(e.clientY-prev.y);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2&&pinch){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);zoomAt(d/pinch.d,(a.x+b.x)/2,(a.y+b.y)/2);pinch.d=d;return}
  const p=svgPt(e.clientX,e.clientY);vt.x+=p.x-last.x;vt.y+=p.y-last.y;applyVT();last=svgPt(e.clientX,e.clientY)});
const endPtr=e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;if(!ptrs.size)svg.classList.remove('grabbing');else{const v=[...ptrs.values()][0];last=svgPt(v.x,v.y)}};
svg.addEventListener('pointerup',e=>{const single=ptrs.size===1&&!pinch;endPtr(e);if(single&&e.button===0)onPick(e)});svg.addEventListener('pointercancel',endPtr);
const tip=document.getElementById('tip'),stage=document.getElementById('stage');
function hoverTip(e){const t=e.target.closest&&e.target.closest('[data-tip]');if(!t){tip.hidden=true;return}const r=stage.getBoundingClientRect();tip.textContent=t.dataset.tip;tip.hidden=false;
  let x=e.clientX-r.left,y=e.clientY-r.top;if(x>r.width-200)x-=200;tip.style.left=x+'px';tip.style.top=y+'px'}
svg.addEventListener('pointerleave',()=>tip.hidden=true);
function onPick(e){if(moved>6)return;const hit=document.elementFromPoint(e.clientX,e.clientY);const t=hit&&hit.closest?hit.closest('[data-kb]'):null;
  scene.querySelectorAll('.sel').forEach(n=>n.classList.remove('sel'));
  if(!t){sel=null;const [k,a]=viewKB(view);showInfo(k,a);return}
  if(t.dataset.go){const [kind,a,b]=t.dataset.go.split(':');const parts=t.dataset.go.slice(kind.length+1);sel=null;
    if(kind==='board'){const g=t;const v=P(0,140,0);g.style.transform=`translate(${v[0]}px,${v[1]}px)`;setTimeout(()=>go({k:'board',n:+a}),260);showInfo(t.dataset.kb);return}
    if(kind==='sub'){go({k:'sub',n:+a,p:+b});return}
    if(kind==='port'){go({k:'port',name:parts});return}}
  sel=t.dataset.id;t.classList.add('sel');showInfo(t.dataset.kb)}
document.getElementById('zin').onclick=()=>{const r=svg.getBoundingClientRect();zoomAt(1.3,r.left+r.width/2,r.top+r.height/2)};
document.getElementById('zout').onclick=()=>{const r=svg.getBoundingClientRect();zoomAt(1/1.3,r.left+r.width/2,r.top+r.height/2)};
document.getElementById('zfit').onclick=fitView;
document.getElementById('xray').onclick=e=>{xray=!xray;e.currentTarget.classList.toggle('on',xray);scene.classList.toggle('xray',xray);if(xray)showInfo('backplane')};
window.addEventListener('resize',()=>{clearTimeout(window._rz);window._rz=setTimeout(fitView,150)});

/* ============ 讲解面板 ============ */
const paneInfo=document.getElementById('pane-info');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let infoKey=null;
function showInfo(key,arg){infoKey=[key,arg];markSeen(key==='iface'?'physif':key);const k=key==='iface'?ifKB(arg):kbOf(key);if(!k)return;
  let h=`<div class="eyebrow">${esc(k.tag)}</div><h2>${esc(k.title)}</h2><div class="en">${esc(k.en)}</div><p class="sum">${esc(k.sum)}</p>`;
  if(k.rows)h+=`<dl class="kv">${k.rows.map(([a,b])=>`<dt>${esc(a)}</dt><dd>${b}</dd>`).join('')}</dl>`;
  if(k.pts&&k.pts.length)h+=`<h3>${L('要点','Key points')}</h3><ul>${k.pts.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>`;
  if(k.cfg)h+=`<div class="cfgbar"><h3>${L('配置示例','Config example')}</h3>${k.run===false?'':`<button class="btn" id="runcfg">${L('在命令行中运行','Run in CLI')}</button>`}</div><pre class="cfg">${k.cfg.map(esc).join('\n')}</pre>${k.note?`<div class="note">${esc(k.note)}</div>`:''}`;
  else if(k.note)h+=`<div class="note">${esc(k.note)}</div>`;
  if(k.links)h+=`<h3>${L('相关概念','Related')}</h3><div class="chips">${k.links.map(([a,b])=>`<button data-k="${a}">${esc(b)}</button>`).join('')}</div>`;
  if(k.drill)h+=`<div class="note" style="margin-top:14px">↖ ${esc(k.drill)}</div>`;
  if(k.src)h+=`<h3>${L('参考资料','Sources')}</h3><ul class="src">${k.src.map(([t,u])=>`<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(L(t,SRC_EN[t]||t))}</a></li>`).join('')}</ul>`;
  h+=`<p class="disclaimer">${L('个人学习项目，非华为官方内容。参数参考华为公开资料；标注「通用原理示意」的部分讲的是行业通用原理，不代表某款设备的具体实现。','A personal learning project, not official Huawei content. Figures follow Huawei public documents; parts marked "generic principle" describe common industry principles, not how any specific device implements them.')}</p>`;
  paneInfo.innerHTML=h;
  const rb=document.getElementById('runcfg');if(rb)rb.onclick=()=>{setTab('cli');runLines(k.cfg)};
  paneInfo.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>showInfo(b.dataset.k));
}
function setTab(t){document.getElementById('tab-info').classList.toggle('on',t==='info');document.getElementById('tab-cli').classList.toggle('on',t==='cli');
  document.getElementById('pane-info').hidden=t!=='info';document.getElementById('pane-cli').hidden=t!=='cli';if(t==='cli'&&matchMedia('(min-width:861px)').matches)cmd.focus()}
document.getElementById('tab-info').onclick=()=>setTab('info');document.getElementById('tab-cli').onclick=()=>setTab('cli');

/* ============ 动画：报文流 ============ */
const DATA='var(--accent)',CTRL='var(--ctrl)';
function chassisFlows(){const s=n=>SX(n)+26,Dn=D+6,ge=GE_Z(0),hg=HG_Z(0),BP=40,IN=D-60;
  return [
  {name:L('数据报文穿越路由器','A data packet crosses the router'),color:DATA,foot:L('全程没有经过主控板 MPU，这就是"分布式转发"。','It never touched the MPU — that is "distributed forwarding".'),steps:[
    {t:L('报文从 1 号槽接口板的 GigabitEthernet1/0/0 进入路由器','The packet enters the router on GigabitEthernet1/0/0 of the line card in slot 1'),hl:['p:GigabitEthernet1/0/0'],paths:[[[s(1),D+110,ge],[s(1),Dn,ge]]]},
    {t:L('1 号槽 LPU 的 NP 查 FIB：目的地址 10.0.13.2 的出接口是 100GE3/1/0，在 3 号槽','The NP on the slot 1 LPU looks up the FIB: destination 10.0.13.2 leaves via 100GE3/1/0, in slot 3'),hl:['slot:1'],paths:[[[s(1),Dn,ge],[s(1),IN,ge]]]},
    {t:L('报文被切成信元，经背板送到交换网板 SFU','The packet is sliced into cells and sent over the backplane to the switch fabric (SFU)'),hl:['slot:7','backplane'],paths:[[[s(1),IN,ge],[s(1),BP,ge],[s(7),BP,ge]]]},
    {t:L('SFU 把信元交换到目的槽位：3 号槽','The SFU switches the cells to the destination slot: slot 3'),hl:['slot:7'],paths:[[[s(7),BP,ge],[s(3),BP,ge]]]},
    {t:L('3 号槽 LPU 把信元重组成报文，TM 在出方向排队调度','The slot 3 LPU reassembles the cells into a packet; the TM queues and schedules it on the way out'),hl:['slot:3'],paths:[[[s(3),BP,ge],[s(3),IN,hg]]]},
    {t:L('报文从 100GE3/1/0 发出，前往下一跳','The packet leaves on 100GE3/1/0 toward the next hop'),hl:['p:100GE3/1/0'],paths:[[[s(3),IN,hg],[s(3),Dn,hg],[s(3),D+120,hg]]]}]},
  {name:L('协议报文上送 + 转发表下发','Protocol packet up, forwarding table down'),color:CTRL,foot:L('控制平面（MPU）负责"算"，转发平面（LPU）负责"转"。','The control plane (MPU) computes; the forwarding plane (LPU) forwards.'),steps:[
    {t:L('邻居发来一个 OSPF Hello 报文，从 GigabitEthernet1/0/0 进入','A neighbor sends an OSPF Hello, which arrives on GigabitEthernet1/0/0'),hl:['p:GigabitEthernet1/0/0'],paths:[[[s(1),D+110,ge],[s(1),Dn,ge]]]},
    {t:L('NP 发现它是发给本机的协议报文（目的地址 224.0.0.5），不转发，走上送通道','The NP sees a protocol packet for this device (destination 224.0.0.5): no forwarding, it goes up to the control plane'),hl:['slot:1'],paths:[[[s(1),Dn,ge],[s(1),IN,ge]]]},
    {t:L('报文经背板的管理通道上送到主用主控板 MPU（5 号槽）','It travels over the backplane management channel to the active MPU (slot 5)'),hl:['slot:5','backplane'],paths:[[[s(1),IN,ge],[s(1),BP,ge],[s(5),BP,300],[s(5),IN,300]]]},
    {t:L('MPU 运行 OSPF：维护邻居、同步链路状态数据库、计算最短路径，生成路由表 RIB，选优后得到转发表 FIB','The MPU runs OSPF: keeps neighbors, syncs the link-state database, computes shortest paths, builds the RIB and picks the best routes into the FIB'),hl:['slot:5'],pulse:[s(5),IN,300],dur:2200},
    {t:L('MPU 把 FIB 下发到每一块接口板，写进各自 NP 的转发表','The MPU pushes the FIB to every line card, into each NP\'s forwarding table'),hl:LPUS.map(n=>'slot:'+n),paths:LPUS.map(n=>[[s(5),IN,300],[s(5),BP,300],[s(n),BP,300],[s(n),IN,300]])},
    {t:L('主用 MPU 同时把状态同步给备用 MPU（6 号槽），主控倒换时业务不中断','The active MPU also syncs its state to the standby MPU (slot 6), so a switchover doesn\'t interrupt services'),hl:['slot:6'],paths:[[[s(5),IN,300],[s(5),BP,300],[s(6),BP,300],[s(6),IN,300]]]}]}]}
function boardFlows(n){if(slotOf(n).type!=='LPU')return[];const Y=412;
  return [
  {name:L('报文在接口板内的处理','Inside the line card'),color:DATA,foot:L('这几步在硬件里只需要几微秒。','In hardware, all of this takes only a few microseconds.'),steps:[
    {t:L(`光纤里的光信号进入 GigabitEthernet${n}/0/0 的光模块，被转换成电信号`,`Light from the fiber enters the optical module of GigabitEthernet${n}/0/0 and becomes an electrical signal`),hl:['p:'+portIf(n,0,0)],paths:[[[55,Y+120,35],[55,Y,35]]]},
    {t:L('子卡上的 PHY/MAC 把比特流组装成以太网帧，检查 FCS 校验，坏帧直接丢弃','The PHY/MAC on the subcard assembles bits into an Ethernet frame and checks the FCS; bad frames are dropped'),hl:['c:pic0'],paths:[[[55,Y,35],[55,380,36],[155,300,36]]]},
    {t:L('NP 解析报文头，到 TCAM 查 FIB 得到出接口和下一跳；TTL 减 1，重写二层头','The NP parses the headers and looks up the FIB in the TCAM for the outgoing interface and next hop; TTL minus 1, new L2 header'),hl:['c:np','c:tcam'],paths:[[[155,300,36],[155,175,10],[210,120,44]]]},
    {t:L('TM 按优先级把报文放入队列，带宽不够时按策略调度或丢弃，QoS 就在这里执行','The TM queues the packet by priority and schedules or drops by policy when bandwidth is short — this is where QoS happens'),hl:['c:tm'],paths:[[[210,120,44],[345,125,20]]]},
    {t:L('报文被切成信元，从背板连接器送往交换网板 SFU','The packet is sliced into cells and sent through the backplane connector to the SFU'),hl:['c:conn'],paths:[[[345,125,20],[345,20,48],[345,-100,48]]]}]},
  {name:L('转发表下发到接口板','Forwarding table down to the line card'),color:CTRL,foot:L('接口板 CPU 只管"写表"，逐包转发由 NP 完成。','The line card CPU only writes tables; per-packet forwarding is done by the NP.'),steps:[
    {t:L('主控板算好的 FIB 经背板管理通道送到本板','The FIB computed by the MPU arrives over the backplane management channel'),hl:['c:conn'],paths:[[[470,-100,48],[470,20,48]]]},
    {t:L('接口板 CPU 收到表项','The line card CPU receives the entries'),hl:['c:lcpu'],paths:[[[470,20,48],[475,90,16]]]},
    {t:L('CPU 把表项写进 TCAM 表项存储','The CPU writes them into the TCAM'),hl:['c:tcam'],paths:[[[475,90,16],[475,160,14]]]},
    {t:L('之后 NP 转发每个报文时直接查这些表项','From now on the NP looks these entries up for every packet'),hl:['c:np'],paths:[[[475,160,14],[270,120,30]]]}]}]}
function currentFlows(){return view.k==='topo'?topoFlows():view.k==='chassis'?(DEV==='router'?chassisFlows():devChassisFlows()):view.k==='board'&&DEV==='router'?boardFlows(view.n):[]}
const flowsEl=document.getElementById('flows'),cap=document.getElementById('caption');
function flowButtons(){flowsEl.innerHTML='';currentFlows().forEach((f,i)=>{const b=document.createElement('button');b.innerHTML=`<span class="dot" style="background:${f.color}"></span>▶ ${esc(f.name)}`;b.onclick=()=>playFlow(i,0);flowsEl.appendChild(b)})}
let A=null;const PJ=a=>a.length===2?a:P(...a);
function stopFlow(){if(A){cancelAnimationFrame(A.raf);clearTimeout(A.to)}A=null;fx.innerHTML='';cap.hidden=true;scene.querySelectorAll('.flash').forEach(n=>n.classList.remove('flash'));flowsEl.querySelectorAll('button').forEach(b=>b.classList.remove('playing'));
  scene.querySelectorAll('.later.on').forEach(n=>n.classList.remove('on'));
  if(view.k==='chassis')scene.classList.toggle('xray',xray)}
function playFlow(fi,si){const f=currentFlows()[fi];if(!f)return;stopFlow();A={fi,si,f};flowsEl.children[fi]?.classList.add('playing');if(view.k==='chassis')scene.classList.add('xray');runStep()}
function runStep(){const {f,si}=A;const st=f.steps[si];if(!st){A.to=setTimeout(()=>{if(A)A.done=true},10);return}
  scene.querySelectorAll('.flash').forEach(n=>n.classList.remove('flash'));(st.hl||[]).forEach(id=>scene.querySelector(`[data-id="${CSS.escape(id)}"]`)?.classList.add('flash'));
  cap.hidden=false;cap.innerHTML=`<div class="n">${si+1}/${f.steps.length}</div><div class="t">${esc(st.t)}${si===f.steps.length-1?`<small>${esc(f.foot)}</small>`:''}</div><div class="ctl"><button id="cp" aria-label="${L('上一步','Previous')}">‹</button><button id="cn" aria-label="${L('下一步','Next')}">›</button><button id="cx" aria-label="${L('关闭','Close')}">✕</button></div>`;
  cap.querySelector('#cp').onclick=()=>{if(A.si>0)jump(A.si-1)};cap.querySelector('#cn').onclick=()=>{if(A.si<f.steps.length-1)jump(A.si+1)};cap.querySelector('#cx').onclick=stopFlow;
  scene.querySelectorAll('[data-show]').forEach(e=>{const [f2,s2]=e.dataset.show.split(':').map(Number);e.classList.toggle('on',A.fi===f2&&si>=s2)});
  fx.querySelectorAll('.fx-dot,.pulse').forEach(n=>n.remove());
  if(st.pulse){const q=PJ(st.pulse);el('circle',{cx:q[0],cy:q[1],r:6,class:'fx-dot',fill:f.color},fx);el('circle',{cx:q[0],cy:q[1],r:4,class:'pulse',stroke:f.color},fx);A.to=setTimeout(next,st.dur||1800);return}
  const lines=(st.paths||[]).map(p=>{const q=p.map(PJ);let LL=0;const seg=[];for(let i=1;i<q.length;i++){const l=Math.hypot(q[i][0]-q[i-1][0],q[i][1]-q[i-1][1]);seg.push(l);LL+=l}
    el('polyline',{points:q.map(a=>a.join(',')).join(' '),class:'fx-trail',stroke:f.color},fx);const dot=el('circle',{r:6,class:'fx-dot',fill:f.color},fx);return {q,seg,LL,dot}});
  const dur=st.dur||Math.max(900,Math.max(...lines.map(l=>l.LL))*5.5),t0=performance.now();
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tok={};A.cur=tok;const tick=now=>{if(!A||A.cur!==tok)return;const t=reduce?1:Math.min(1,(now-t0)/dur);lines.forEach(l=>{let d=t*l.LL,i=0;while(i<l.seg.length-1&&d>l.seg[i]){d-=l.seg[i];i++}const r=l.seg[i]?d/l.seg[i]:1;const a=l.q[i],b=l.q[i+1]||a;l.dot.setAttribute('cx',a[0]+(b[0]-a[0])*r);l.dot.setAttribute('cy',a[1]+(b[1]-a[1])*r)});
    if(t<1)A.raf=requestAnimationFrame(tick);else A.to=setTimeout(next,1500)};A.raf=requestAnimationFrame(tick)}
function next(){if(!A)return;if(A.si<A.f.steps.length-1){A.si++;runStep()}}
function jump(i){cancelAnimationFrame(A.raf);clearTimeout(A.to);A.si=i;if(i===0)fx.innerHTML='';runStep()}

/* ============ 命令行 ============ */
const out=document.getElementById('out'),cmd=document.getElementById('cmd'),promptEl=document.getElementById('prompt');
let mode='user',curIf=null;const hist=[];let hi=0;
const prompt=()=>{const f=pending?'*':'~';return mode==='user'?`<${sysname}>`:mode==='sys'?`[${f}${sysname}]`:`[${f}${sysname}-${curIf}]`};
function stageCfg(){pending=true;promptEl.textContent=prompt()}
function commitCfg(){Object.keys(IF).forEach(k=>{if(!CIF[k])delete IF[k]});Object.entries(clone(CIF)).forEach(([k,v])=>IF[k]=v);sysname=csys;pending=false;refresh()}
function candDiff(){const LL=[];if(csys!==sysname)LL.push(`sysname ${csys}`,'#');Object.values(CIF).forEach(i=>{const a=ifCfg(i).join('\n'),b=IF[i.name]?ifCfg(IF[i.name]).join('\n'):null;if(a!==b){LL.push(...ifCfg(i),'#')}});return LL}
function print(s,cls){const span=document.createElement('span');if(cls)span.className=cls;span.textContent=s+'\n';out.appendChild(span);out.scrollTop=out.scrollHeight}
const len2mask=l=>{const m=l?(0xffffffff<<(32-l))>>>0:0;return [24,16,8,0].map(s=>(m>>>s)&255).join('.')};
function mask2len(m){if(/^\d+$/.test(m)){const n=+m;return n>=0&&n<=32?n:null}const p=m.split('.').map(Number);if(p.length!==4||p.some(v=>isNaN(v)||v<0||v>255))return null;const b=p.reduce((a,v)=>a*256+v,0).toString(2).padStart(32,'0');return /^1*0*$/.test(b)?b.indexOf('0')===-1?32:b.indexOf('0'):null}
const ipOk=s=>/^(\d{1,3})(\.\d{1,3}){3}$/.test(s)&&s.split('.').every(v=>+v<=255);
function normIf(s){s=s.replace(/\s+/g,'');const m=s.match(/^(gigabitethernet|gigabit|ge|g|100ge|loopback|loop|lo|null|eth-trunk)([\d/]+)(?:\.(\d+))?$/i);if(!m)return null;
  const t=m[1].toLowerCase();const type=/^(g|ge|gigabit|gigabitethernet)$/.test(t)?'GigabitEthernet':t==='100ge'?'100GE':/^lo/.test(t)?'LoopBack':t==='null'?'NULL':'Eth-Trunk';return type+m[2]+(m[3]?'.'+m[3]:'')}
const kw=(tok,word,min=1)=>tok&&tok.length>=min&&word.startsWith(tok.toLowerCase());
const pad=(s,n)=>String(s).padEnd(n);
function sortIfs(){const order={phy:0,sub:1,loop:2,null:3};return Object.values(IF).sort((a,b)=>(order[a.kind]-order[b.kind])||((a.slot||0)-(b.slot||0))||((a.pic||0)-(b.pic||0))||((a.port||0)-(b.port||0))||a.name.localeCompare(b.name,undefined,{numeric:true}))}
function ifCfg(i){const LL=[`interface ${i.name}`];if(i.desc)LL.push(` description ${i.desc}`);if(i.kind!=='phy'||!i.admin)if(!i.admin)LL.push(' shutdown');if(i.vid)LL.push(` dot1q termination vid ${i.vid}`);if(i.ip)LL.push(` ip address ${i.ip} ${len2mask(i.len)}`);return LL}
function exec(line){const raw=line.trim();print(prompt()+raw,'p');if(!raw)return;const t=raw.split(/\s+/),t0=t[0];
  const err=(m)=>print(m||`Error: Unrecognized command found at '^' position.  ${L('（演示版支持的命令可输入 ? 查看）','(type ? to see the commands this demo supports)')}`,'e');
  if(t0==='?'||t0==='help'){help();return}
  if(kw(t0,'display',3)){
    const a=t[1];
    if(kw(a,'device',3)){print(`${sysname}'s Device status:\nSlot   Type   Online    Register     Status   Role\n------------------------------------------------------`);SLOTS.forEach(s=>print(`${pad(s.n,7)}${pad(s.type||'-',7)}${pad(s.type?'Present':'Absent',10)}${pad(s.type?(s.role==='主用'?'NA':'Registered'):'-',13)}${pad(s.type?'Normal':'-',9)}${s.role==='主用'?'Master':s.role==='备用'?'Slave':s.type?'NA':'-'}`));['PWR1','PWR2','PWR3','PWR4','FAN'].forEach(p=>print(`${pad(p,7)}${pad(p==='FAN'?'FAN':'PWR',7)}${pad('Present',10)}${pad('Registered',13)}${pad('Normal',9)}NA`));return}
    if(kw(a,'version',1)){print(`Demo Router Software, Version 1.0 (${L('教学模拟','teaching simulation')})\n${sysname} uptime is 0 week, 0 day, 1 hour\nMPU(Master) 5 : uptime is 0 week, 0 day, 1 hour\nMPU(Slave)  6 : uptime is 0 week, 0 day, 1 hour`);return}
    if(kw(a,'interface',3)&&kw(t[2],'brief',1)){print('PHY: Physical\n*down: administratively down\nInterface                        PHY      Protocol');sortIfs().forEach(i=>print(`${pad(i.name,33)}${pad(i.admin?phyUp(i)?'up':'down':'*down',9)}${protoUp(i)?'up':'down'}`));return}
    if(kw(a,'ip',2)&&kw(t[2],'interface',3)&&kw(t[3],'brief',1)){print('*down: administratively down\nInterface                        IP Address/Mask      Physical   Protocol');sortIfs().filter(i=>i.ip||i.kind==='null').forEach(i=>print(`${pad(i.name,33)}${pad(i.ip?i.ip+'/'+i.len:'unassigned',21)}${pad(i.admin?phyUp(i)?'up':'down':'*down',11)}${protoUp(i)?'up':'down'}`));return}
    if(kw(a,'interface',3)&&t[2]){const n=normIf(t.slice(2).join(''));const i=IF[n];if(!i){err('Error: Wrong parameter found at \'^\' position.');return}
      print(`${n} current state : ${i.admin?phyUp(i)?'UP':'DOWN':'Administratively DOWN'}\nLine protocol current state : ${protoUp(i)?'UP':'DOWN'}\nDescription: ${i.desc||''}\nRoute Port,The Maximum Transmit Unit is 1500\nInternet Address is ${i.ip?i.ip+'/'+i.len:'not configured'}\nIP Sending Frames' Format is PKTFMT_ETHNT_2, Hardware address is ${macOf(i.parent||n)}${i.speed?`\nPort BW: ${i.speed.replace('bps','')}, Transceiver: ${i.cable?i.optic:'absent'}`:''}`);return}
    if(kw(a,'transceiver',2)){const n=normIf(t.slice(3).join(''));const i=IF[n];if(!i||i.kind!=='phy'){err('Error: Wrong parameter found at \'^\' position.');return}if(!i.cable){print(`${n} transceiver information:\nThe transceiver is absent.`);return}
      print(`${n} transceiver information:\n-------------------------------------------\n Transceiver Type      : ${i.optic==='SFP'?'1000_BASE_LX_SFP':'100GBASE_LR4_QSFP28'}\n Connector Type        : LC\n Wavelength(nm)        : ${i.optic==='SFP'?'1310':'1295/1300/1304/1309'}\n Transfer Distance(m)  : 10000(9um)\n Current Rx Power(dBm) : -5.62\n Current Tx Power(dBm) : -2.31\n Default Rx Power High Threshold(dBm) : 0.50\n Default Rx Power Low  Threshold(dBm) : -20.00`);return}
    if(kw(a,'this',2)){if(mode==='if')(IF[curIf]?ifCfg(IF[curIf]):[`interface ${curIf}`]).concat(['#','return']).forEach(l=>print(l));else if(mode==='sys')print(`#\n sysname ${sysname}\n#\nreturn`);else err();return}
    if(kw(a,'current-configuration',3)){print(`#\nsysname ${sysname}\n#`);sortIfs().filter(i=>i.ip||i.desc||!i.admin||i.kind!=='phy').forEach(i=>{ifCfg(i).forEach(l=>print(l));print('#')});print('return');return}
    if(kw(a,'configuration',3)&&kw(t[2],'candidate',2)){if(mode==='user'){err();return}const LL=candDiff();if(!LL.length)print(L('（教学模拟）当前没有未提交的配置。','(Teaching simulation) No uncommitted changes.'),'h');else{print('#');LL.forEach(l=>print(l));print('return')}return}
    err();return}
  if(kw(t0,'system-view',3)){if(mode==='user'){mode='sys';print('Enter system view, return user view with return command.','h')}return}
  if(kw(t0,'return',3)){mode='user';curIf=null;if(pending)print(L('提示（教学模拟）：还有未提交的配置，回到系统视图执行 commit 才会生效。','Note (teaching simulation): there are uncommitted changes. Go back to system view and run commit to apply them.'),'h');return}
  if(kw(t0,'quit',1)){if(mode==='if'){mode='sys';curIf=null}else if(mode==='sys')mode='user';return}
  if(mode==='user'){err();return}
  if(kw(t0,'commit',3)){if(pending){commitCfg();print(L('（教学模拟）配置已提交生效，左侧设备图已更新。','(Teaching simulation) Changes committed; the device view on the left is updated.'),'h')}return}
  if(kw(t0,'clear',2)&&kw(t[1],'configuration',3)&&kw(t[2],'candidate',2)){CIF=clone(IF);csys=sysname;pending=false;if(mode==='if'&&!CIF[curIf]){mode='sys';curIf=null}print(L('（教学模拟）未提交的配置已清除。','(Teaching simulation) Uncommitted changes cleared.'),'h');return}
  if(kw(t0,'sysname',3)&&mode==='sys'&&t[1]){csys=t[1].slice(0,30);stageCfg();return}
  if(kw(t0,'interface',3)){const n=normIf(t.slice(1).join(''));if(!n){err('Error: Wrong parameter found at \'^\' position.');return}
    if(!CIF[n]){const base=n.split('.')[0];if(n.includes('.')&&CIF[base]&&CIF[base].kind==='phy'){addIf(n,{kind:'sub',parent:base},CIF)}else if(/^LoopBack\d+$/.test(n)){addIf(n,{kind:'loop'},CIF)}else if(n.startsWith('Eth-Trunk')){err(L('Info: 演示版暂不支持 Eth-Trunk。','Info: The demo does not support Eth-Trunk yet.'));return}else{err(L(`Error: 接口 ${n} 不存在。本机接口板在 ${LPUS.join('、')} 号槽，GE 端口 0-7，100GE 端口 0-1。`,`Error: Interface ${n} does not exist. Line cards are in slots ${LPUS.join(', ')}; GE ports 0-7, 100GE ports 0-1.`));return}stageCfg()}
    mode='if';curIf=n;return}
  if(mode!=='if'){err();return}
  const i=CIF[curIf];const undo=kw(t0,'undo',2);const c=undo?t.slice(1):t;
  if(kw(c[0],'shutdown',4)){if(i.kind==='null'){err(L('Error: NULL 接口不支持该操作。','Error: This operation is not supported on the NULL interface.'));return}i.admin=undo;stageCfg();return}
  if(kw(c[0],'description',4)){i.desc=undo?'':c.slice(1).join(' ').slice(0,60);stageCfg();return}
  if(kw(c[0],'ip',2)&&kw(c[1],'address',3)){if(i.kind==='null'){err(L('Error: NULL 接口不能配置 IP 地址。','Error: The NULL interface cannot have an IP address.'));return}
    if(undo){i.ip=null;i.len=null;stageCfg();return}if(!ipOk(c[2]||'')){err('Error: Wrong parameter found at \'^\' position.  '+L('格式：ip address 10.1.1.1 255.255.255.252 或 ip address 10.1.1.1 30','Format: ip address 10.1.1.1 255.255.255.252 or ip address 10.1.1.1 30'));return}
    const LL=mask2len(c[3]||'');if(LL==null){err(L('Error: 掩码无效。','Error: Invalid mask.'));return}
    const dup=Object.values(CIF).find(o=>o!==i&&o.ip&&o.len&&LL&&sameNet(o.ip,o.len,c[2],LL));if(dup){err(`Error: The specified IP address conflicts with ${dup.name}.`);return}
    i.ip=c[2];i.len=LL;stageCfg();return}
  if(kw(c[0],'dot1q',3)){if(i.kind!=='sub'){err(L('Error: 只有子接口才能配置 dot1q termination vid。','Error: Only sub-interfaces support dot1q termination vid.'));return}if(undo){i.vid=null;stageCfg();return}const v=+c[3];if(!(v>=1&&v<=4094)){err(L('Error: VLAN ID 范围是 1-4094。','Error: The VLAN ID range is 1-4094.'));return}i.vid=v;stageCfg();return}
  err()}
function ip2n(s){return s.split('.').reduce((a,v)=>a*256+ +v,0)}
function sameNet(a,la,b,lb){const l=Math.min(la,lb);if(!l)return false;const m=Math.pow(2,32-l);return Math.floor(ip2n(a)/m)===Math.floor(ip2n(b)/m)}
function help(){const H={user:['display device            查看单板状态','display version           查看软件版本','display interface brief   查看所有接口状态','display ip interface brief  查看三层接口','display interface <名称>   查看接口详情','display transceiver interface <名称>  查看光模块','display current-configuration  查看已生效的配置','system-view               进入系统视图'],
  sys:['interface <名称>          进入接口视图，如 interface GE1/0/2','interface GE1/0/0.300     创建子接口','interface LoopBack1       创建环回接口','sysname <名字>            修改设备名','commit                    提交配置，改动这时才生效','display configuration candidate  查看还没提交的改动','clear configuration candidate    放弃还没提交的改动','display ...               任意视图都能用','quit / return             返回'],
  if:['ip address <IP> <掩码>    配置 IP，掩码可写 24 或 255.255.255.0','undo ip address           删除 IP','shutdown / undo shutdown  关闭 / 打开接口','description <文字>        接口描述','dot1q termination vid <N> 子接口终结 VLAN','display this              查看本接口已生效的配置','commit                    提交配置','quit                      返回系统视图']};
  const HE={user:['display device            board status','display version           software version','display interface brief   status of all interfaces','display ip interface brief  layer-3 interfaces','display interface <name>  interface details','display transceiver interface <name>  optical module','display current-configuration  configuration in effect','system-view               enter system view'],
  sys:['interface <name>          enter interface view, e.g. interface GE1/0/2','interface GE1/0/0.300     create a sub-interface','interface LoopBack1       create a loopback interface','sysname <name>            rename the device','commit                    commit; changes take effect now','display configuration candidate  show uncommitted changes','clear configuration candidate    discard uncommitted changes','display ...               works in any view','quit / return             go back'],
  if:['ip address <IP> <mask>    set IP; mask as 24 or 255.255.255.0','undo ip address           remove IP','shutdown / undo shutdown  turn interface off / on','description <text>        interface description','dot1q termination vid <N> terminate a VLAN on a sub-interface','display this              committed config of this interface','commit                    commit changes','quit                      back to system view']};
  (LANG==='en'?HE:H)[mode].forEach(l=>print(l,'h'))}
function refresh(){promptEl.textContent=prompt();const keepVT={...vt};render(view,{fit:false,animate:false});vt=keepVT;applyVT();if(infoKey&&infoKey[0]==='iface')showInfo('iface',infoKey[1])}
function runLines(lines){let d=0;lines.forEach(l=>setTimeout(()=>{exec(l);promptEl.textContent=prompt()},d+=260))}
cmd.addEventListener('keydown',e=>{if(e.key==='Enter'){const v=cmd.value;if(v.trim()){hist.push(v)}hi=hist.length;cmd.value='';exec(v);promptEl.textContent=prompt()}
  else if(e.key==='ArrowUp'){if(hi>0){hi--;cmd.value=hist[hi]}e.preventDefault()}else if(e.key==='ArrowDown'){if(hi<hist.length){hi++;cmd.value=hist[hi]||''}e.preventDefault()}});
const chipsEl=document.getElementById('chips');
['display device','display interface brief','display ip interface brief','display current-configuration','?'].forEach(c=>{const b=document.createElement('button');b.textContent=c;b.onclick=()=>{exec(c);promptEl.textContent=prompt()};chipsEl.appendChild(b)});
const welcome=()=>print(L('欢迎使用模拟路由器（教学模拟）。命令风格参考华为配置指南：配置命令先进入「候选配置」，提示符变成 [*HUAWEI]，执行 commit 后才生效。\n输入 ? 查看当前视图可用的命令。试试：display device','Welcome to the simulated router (teaching simulation). Commands follow the Huawei configuration guide: config changes go into a "candidate configuration" first (the prompt shows [*HUAWEI]) and only take effect after commit.\nType ? to see the commands for the current view. Try: display device'),'h');welcome();

/* ============ 启动 ============ */
/* ============ 风格与探索进度 ============ */
const SKINS=[
  ['notebook','手账笔记',['#2b59c3','#ffde59','#f3f6fb'],'方格纸、手绘线条、荧光笔标题','Notebook','Grid paper, hand-drawn lines, highlighter titles'],
  ['anatomy','解剖图谱',['#9e2b25','#e8b4a0','#efe6d6'],'像医学解剖图：剖面、阴影线、编号引线标注','Anatomy Atlas','Like a medical atlas: cutaways, hatching, numbered callouts'],
  ['whiteboard','白板手绘',['#1d1d1f','#e8453c','#ffffff'],'白板马克笔，草图感，手写标注','Whiteboard','Marker on a whiteboard, sketchy, handwritten notes'],
  ['chalk','黑板粉笔',['#2c4a3e','#f5e27a','#f4a3b5'],'课堂黑板，彩色粉笔勾画','Chalkboard','Classroom blackboard with colored chalk'],
  ['blueprint','晒图蓝图',['#0d3b78','#dbe9ff','#5fa8ff'],'工程晒图，白线描在深蓝底上','Blueprint','White lines on deep-blue engineering prints'],
  ['neon','霓虹机房',['#070b1a','#19e3ff','#ff3dbb'],'深色科幻，发光描边','Neon Server Room','Dark sci-fi with glowing outlines'],
  ['blocks','积木乐园',['#bfe3ff','#ff8a3d','#8c6bff'],'粗描边、高饱和，板卡按类型上色','Toy Blocks','Bold outlines, saturated colors, boards colored by type'],
  ['eng','工程素描',['#e8ecef','#0a7c89','#9ca7b0'],'冷静克制的工业设计稿','Engineering Sketch','Calm, restrained industrial design drawing']];
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const skinsEl=document.getElementById('skins');
const swatch=c=>`<span class="sw" style="background:linear-gradient(135deg,${c[2]} 0 40%,${c[0]} 40% 70%,${c[1]} 70%)"></span>`;
skinsEl.innerHTML=`<button id="langbtn"></button><button id="skinbtn" aria-haspopup="true" aria-expanded="false"></button><div class="skinmenu" id="skinmenu" hidden role="menu"></div>`;
const skinBtn=document.getElementById('skinbtn'),skinMenu=document.getElementById('skinmenu');
function buildSkinMenu(){skinMenu.innerHTML='';SKINS.forEach(([id,name,c,desc,nameEn,descEn])=>{const b=document.createElement('button');b.dataset.s=id;b.setAttribute('role','menuitemradio');b.innerHTML=`${swatch(c)}<span><b>${L(name,nameEn)}</b><small>${L(desc,descEn)}</small></span>`;b.onclick=()=>{setSkin(id);skinMenu.hidden=true;skinBtn.setAttribute('aria-expanded','false')};skinMenu.appendChild(b)})}
buildSkinMenu();
skinBtn.onclick=e=>{e.stopPropagation();skinMenu.hidden=!skinMenu.hidden;skinBtn.setAttribute('aria-expanded',String(!skinMenu.hidden))};
document.addEventListener('click',e=>{if(!skinsEl.contains(e.target)){skinMenu.hidden=true;skinBtn.setAttribute('aria-expanded','false')}});
function setSkin(id){const k=SKINS.find(s=>s[0]===id)||SKINS[0];document.documentElement.dataset.skin=k[0];store.set('dc-skin',k[0]);
  skinBtn.innerHTML=`${swatch(k[2])}${L('风格：'+k[1],'Style: '+k[4])} ▾`;skinMenu.querySelectorAll('button').forEach(b=>b.setAttribute('aria-checked',b.dataset.s===k[0]));setTimeout(fitView,60)}
let seen=new Set();try{seen=new Set(JSON.parse(store.get('dc-seen')||'[]'))}catch(e){}
function markSeen(k){if(!KB[k])return;const isNew=!seen.has(k);seen.add(k);if(isNew)store.set('dc-seen',JSON.stringify([...seen]));updXP(isNew)}
function updXP(pop){const n=[...seen].filter(k=>KB[k]).length,t=Object.keys(KB).length;document.getElementById('xpn').textContent=`${n}/${t}`;document.getElementById('xpb').style.width=(n/t*100)+'%';
  if(pop){const x=document.getElementById('xp');x.classList.remove('pop');void x.offsetWidth;x.classList.add('pop')}}
/* ============ 设备切换 ============ */
const devbarEl=document.getElementById('devbar');
function devBar(){devbarEl.innerHTML='';Object.entries(DEVS).forEach(([id,d])=>{const b=document.createElement('button');b.textContent=L(d.zh,d.en);b.setAttribute('aria-pressed',String(id===DEV));b.onclick=()=>setDev(id);devbarEl.appendChild(b)});
  if(dv().topo){const b=document.createElement('button');b.className='how';b.textContent='▶ '+L('原理演示','How it works');b.setAttribute('aria-pressed',String(view.k==='topo'));b.onclick=()=>{sel=null;go({k:'topo'})};devbarEl.appendChild(b)}}
function setDev(id){if(!DEVS[id])return;DEV=id;store.set('dc-dev',id);sel=null;go({k:'chassis'})}

/* ============ 语言切换 ============ */
const STATIC_TXT=[ // [选择器, 属性, 中文, English]
  ['.brand b','textContent','数通设备实验室','DataCom Lab'],['.brand span','textContent','DataCom Lab','数通设备实验室'],
  ['#modules','aria-label','课程','Lessons'],['#modules button:nth-child(1)','textContent','设备结构与基础配置','Device Basics'],
  ['#modules button:nth-child(2)','innerHTML','基础组网<small>下一步</small>','Basic Networking<small>next</small>'],
  ['#xp','title','点过的部件和概念会被记录','Parts and concepts you open are counted'],['#xp span','textContent','已探索','Explored'],
  ['#skins','aria-label','页面风格','Page style'],
  ['#zin','title','放大','Zoom in'],['#zin','aria-label','放大','Zoom in'],['#zout','title','缩小','Zoom out'],['#zout','aria-label','缩小','Zoom out'],
  ['#zfit','title','重置视角','Reset view'],['#zfit','aria-label','重置视角','Reset view'],['#xray','title','透视机框','X-ray chassis'],['#xray','aria-label','透视机框','X-ray chassis'],
  ['#devbar','aria-label','设备','Devices'],['#svg','aria-label','设备视图','Device view'],['#tab-info','textContent','讲解','Explain'],['#tab-cli','textContent','命令行实验','CLI Lab'],
  ['#pane-cli > .note','innerHTML',document.querySelector('#pane-cli > .note').innerHTML,'<b>Teaching simulation</b>: commands follow the Huawei configuration guide. Config commands first change the "candidate configuration" (the prompt shows <code>*</code>); only after <code>commit</code> do they take effect and show on the device at left. For example, <code>shutdown</code> an interface, then <code>commit</code>, and its port LED goes dark.'],
  ['#cmd','aria-label','命令输入','Command input'],['#cmd','placeholder','输入命令，? 查看帮助','Type a command, ? for help']];
const langBtn=document.getElementById('langbtn');
function applyStatic(){document.documentElement.lang=L('zh-CN','en');document.title=L('数通设备实验室','DataCom Lab');
  STATIC_TXT.forEach(([sel,prop,zh,en])=>{const e=document.querySelector(sel);if(!e)return;const v=L(zh,en);if(prop==='textContent'||prop==='innerHTML')e[prop]=v;else e.setAttribute(prop,v)});
  langBtn.textContent=L('EN','中文');langBtn.title=L('Switch to English','切换到中文');langBtn.setAttribute('aria-label',langBtn.title)}
function setLang(l){LANG=l==='en'?'en':'zh';store.set('dc-lang',LANG);applyStatic();buildSkinMenu();setSkin(document.documentElement.dataset.skin);
  const keepVT={...vt};render(view,{fit:false,animate:false});vt=keepVT;applyVT();if(infoKey)showInfo(infoKey[0],infoKey[1]);welcome()}
langBtn.onclick=e=>{e.stopPropagation();setLang(LANG==='en'?'zh':'en')};
applyStatic();
setSkin(store.get('dc-skin')||'notebook');
render({k:'chassis'},{animate:false});showInfo(dv().kb);
