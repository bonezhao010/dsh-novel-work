/**
 * Demo library content for the novel workbench.
 *
 * All prose is Markdown and all board data is plain JSON so the first launch
 * immediately shows every tool with realistic cross-references. New works use
 * the empty template in index.js instead of this seed.
 */

const CH1 = 'manuscript/001-第一卷 潮声/001-第一章 雾中来信.md'
const CH2 = 'manuscript/001-第一卷 潮声/002-第二章 失踪的邮船.md'
const CH3 = 'manuscript/001-第一卷 潮声/003-第三章 灯塔守夜人.md'
const CH4 = 'manuscript/002-第二卷 暗礁/001-第四章 潮汐日志.md'
const CH5 = 'manuscript/002-第二卷 暗礁/002-第五章 暗礁之下.md'
const CH6 = 'manuscript/002-第二卷 暗礁/003-第六章 最后一封信.md'

export const demoBook = {
  id: 'mist-harbor',
  title: '雾港来信',
  author: '示例作者',
  genre: '悬疑 / 海港',
  logline: '一封迟到十年的信，把邮差林砚拖回父亲失踪的那场海难。',
  description: '雾港的邮船“白鹭号”在十年前的一个雾夜失踪。十年后，邮差林砚收到一封盖着旧邮戳、收件人却是自己的信。信里只有一句话：潮退的时候，去灯塔下面找。',
  createdAt: '2026-11-01T09:00:00.000Z',
  updatedAt: '2026-11-13T09:00:00.000Z',
}

export const demoChapters = [
  {
    path: CH1,
    content: `# 第一章 雾中来信

雾港的早晨从来不属于太阳。

林砚把自行车停在老邮局门口的时候，海雾正顺着石阶往上爬。台阶湿得像刚哭过，墙角那盏煤油灯还亮着，灯芯短得只剩一截红线。他摸出钥匙，铁门发出一种被吵醒的呻吟。

分拣台上躺着昨夜最后一班船送来的邮袋。袋子是湿的，邮戳却干得反常——日期是十年前。

“又是谁的恶作剧。”林砚嘟囔了一句，把袋子倒过来。

信件哗啦一声散开。大部分是广告和账单，只有最底下那封，牛皮纸，边角发黑，正面用工整的钢笔字写着：

> 雾港邮政局 林砚 收

没有寄件人。

他翻到背面，封口处压着一枚褪色的火漆，图案是一只展翅的白鹭。

林砚的手指停住了。

白鹭号。十年前在雾里消失的那条邮船，船头就画着这只鸟。那年他十九岁，父亲是船上的邮务员。船没有回来，父亲也没有。

他拆开信。信纸上只有一句话，墨迹却像刚刚干透：

**潮退的时候，去灯塔下面找。**

窗外，雾更浓了。远处传来一声汽笛，拖得很长，像是有人在雾里喊他的名字。
`,
  },
  {
    path: CH2,
    content: `# 第二章 失踪的邮船

港务局的档案室在地下二层，空气里有盐和旧纸的味道。

沈雾把一盏台灯推到林砚面前，灯光照亮她袖口的一小片墨渍。“白鹭号的卷宗，我替你找了三个晚上。”她说，“按规定，我不能把它交给你。”

“所以你给我看？”

“我只是在整理旧档案。”她垂着眼，睫毛在灯下投出一小片阴影，“你正好在这里。”

卷宗很薄。薄得不像一条船，更不像七条人命。

最后一页是当年的搜救记录：*“海面能见度不足十米，未发现残骸，推定沉没。”* 推定的“定”字被人用钢笔重重描过，纸面几乎被划破。

林砚翻到背面，发现一行铅笔字，很淡：

**白鹭号没有沉。它只是去了不该去的地方。**

“这行字是谁写的？”他问。

沈雾沉默了一会儿，把台灯往自己那边挪了挪。“我父亲。”她说，“他是最后一任港务局长。写完这行字的第二天，他就辞职了。”

门外传来脚步声。沈雾迅速合上卷宗，把它塞进最下层的铁柜。锁扣“咔”地一声合拢，像谁在黑暗里咬紧了牙。

“明天涨潮之前，”她低声说，“别再来这里。”
`,
  },
  {
    path: CH3,
    content: `# 第三章 灯塔守夜人

灯塔在雾港最北端，像一根被海遗忘的骨头。

林砚到的时候，守塔人阿婆正在给灯室擦玻璃。她八十岁了，背驼得厉害，手却稳。抹布一圈一圈转，玻璃上连一道水痕都不留。

“找白鹭号？”阿婆没有回头。

“您怎么知道？”

“这几天，雾里有船的味儿。”她终于转过身，浑浊的眼睛盯着林砚，“你父亲来过。就在船失踪前一晚。”

林砚的喉咙发紧。“他来说了什么？”

阿婆从围裙口袋里摸出一枚铜钥匙，放进他掌心。钥匙很小，齿口磨得发亮，柄上刻着一个数字：**17**。

“他说，如果他没回来，就把这个交给一个会在雾天来问船的人。”阿婆顿了顿，“他还说，别相信潮汐表。”

灯室的玻璃忽然震了一下。远处海面上，有一盏灯在雾里亮起，又熄灭。不是灯塔的节奏。

阿婆脸色变了。“今晚不该有船。”

她伸手去拉警铃，手停在半空。灯室下面，传来三下敲门声。很慢，很沉，像有什么东西从海底走了上来。
`,
  },
  {
    path: CH4,
    content: `# 第四章 潮汐日志

十七号储物柜在旧码头尽头的仓库里。

林砚把铜钥匙插进去时，锁芯发出干涩的转动声。柜门打开，里面只有一本湿透的潮汐日志和半盒火柴。

日志的封皮上写着父亲的名字。他翻开第一页，纸张已经发脆，边缘粘在一起。前十页都是正常的潮汐记录，直到十年前的那个雾夜。

那一页被人撕掉了。

但父亲有个习惯：重要的事情会压在纸下。林砚把日志举到灯前，果然看见下一页留下浅浅的压痕。

> 十月初七，白鹭号载货七箱，货主周启明。开船前，周局长亲自上船验货。箱子很轻，里面不像货物，像——
>
> 有人上来了。如果我没能回来，告诉阿砚，去问沈家那姑娘。她父亲知道十七号柜里藏着什么。

日志到这里断了。

仓库外忽然响起脚步声。林砚吹灭火柴，把日志塞进外套。门缝里透进一道手电光，光柱慢慢扫过货架，停在他藏身的角落。

“林邮差。”一个温和的声音说，“你父亲的旧东西，看够了吗？”

周启明站在门口，身后跟着两个穿雨衣的人。他手里也有一枚铜钥匙，柄上刻着同样的数字：**17**。
`,
  },
  {
    path: CH5,
    content: `# 第五章 暗礁之下

退潮后的礁滩像一排排黑色的牙齿。

沈雾走在前面，手电只照脚下三步。林砚跟在她身后，海水漫过脚踝，冷得刺骨。远处灯塔的光每隔十二秒扫过一次，把两个人的影子拉得很长。

“你父亲在日志里提到你。”林砚说。

“我知道。”沈雾没有回头，“他留了一封信给我，让我等你来。”

“等我？”

“他说，林家的人总有一天会拿着十七号钥匙回来。”她在一块礁石前停下，蹲下身，拨开附着的藤壶。石面上露出一个生锈的铁环。

铁环下面是一道向下的石阶，海水正从阶缝里往上渗。

“白鹭号没有沉。”沈雾说，“它被藏在这条水道里。周启明用那七只箱子运的不是货，是人。”

林砚想起父亲日志里没写完的那句话，胃里一阵发紧。“什么人？”

“十年前从北边逃过来的人。周启明收了钱，答应送他们走，然后在海上把船交给了另一条船。”沈雾的声音很轻，“我父亲负责改潮汐表，让搜救队找错方向。他后来后悔了，但已经太迟。”

石阶下传来一声闷响，像铁门被风撞了一下。

又一声。

不是风。
`,
  },
  {
    path: CH6,
    content: `# 第六章 最后一封信

水道尽头是一间石室，墙上挂着一盏还在亮的旧马灯。

马灯下摆着七只木箱，箱子已经空了。最里面那只箱子上，放着一叠信，用油纸包着，最上面一封的字迹林砚再熟悉不过。

父亲写给他的。

“阿砚，如果你看到这些信，说明我还是没能回去。”信的开头没有称呼，也没有日期，“白鹭号上的人，我把他们送上了另一条船。船去了南边，具体到哪里，只有周启明知道。我留下来，是因为还有一件东西必须沉到海底，不能让周启明找到。”

林砚翻到下一页。父亲写：

>  灯塔的灯不是给船看的，是给水下的人看的。灯灭的那一夜，白鹭号会最后一次浮上来。

信纸背面，是一张手绘的海图。雾港、灯塔、暗礁，三点之间画着一条细线，线的尽头写着一个日期：**今晚**。

石室外，海水开始上涨。沈雾抓住他的手腕，声音发抖：“林砚，你听。”

雾里传来一声汽笛。

十年前的那一声。

灯塔的光扫过石室，马灯同时熄灭。黑暗里，林砚听见父亲的声音，很近，又很远：

“潮退了。来灯塔下面找。”
`,
  },
]

export const demoWorkbench = {
  version: 1,
  settings: {
    wordGoal: 3000,
  },
  characters: [
    {
      id: 'c-linyan',
      name: '林砚',
      role: '主角',
      age: '29',
      tags: ['调查者', '邮差', '旧案之子'],
      appearance: '瘦高，常穿洗得发白的邮政制服，右手虎口有一道被邮袋割出的旧疤。',
      personality: '克制、执拗，习惯把问题写成地址再一一投递。害怕海，却总往海边走。',
      goal: '查明父亲与白鹭号失踪的真相，把最后一封信送到收件人手里。',
      ultimateGoal: '把父亲最后一封信送到收件人手里，并让白鹭号的名字重新出现在航海图上。',
      secret: '他其实记得十年前那个雾夜的一部分，只是一直不愿承认。',
      status: '主线',
      notes: '叙述视角人物。每卷结尾让他主动做一个“投递”动作，形成仪式感。',
      quests: [
        { id: 'q-ly-1', title: '找到十七号储物柜里的潮汐日志', type: 'main', status: 'done', involvedCharacterIds: [], note: '' },
        { id: 'q-ly-2', title: '在退潮前进入暗礁水道', type: 'main', status: 'active', involvedCharacterIds: ['c-shenwu'], note: '' },
        { id: 'q-ly-3', title: '让阿杰相信大人也能守约', type: 'side', status: 'active', involvedCharacterIds: ['c-ajie'], note: '' },
      ],
    },
    {
      id: 'c-shenwu',
      name: '沈雾',
      role: '盟友',
      age: '27',
      tags: ['档案员', '港务局', '隐瞒者'],
      appearance: '短发，袖口常有墨渍，走路很轻，像怕惊动地板下的东西。',
      personality: '冷静、精确，擅长用规则作掩护。对林砚的信任来得慢，但一旦给出就不再收回。',
      goal: '替父亲完成未竟的赎罪，同时保住母亲留下的房子。',
      ultimateGoal: '公开父亲留下的证词，把雾港档案室还给真相。',
      secret: '她比林砚更早知道白鹭号没有沉，而且参与过掩埋证据。',
      status: '主线',
      notes: '与林砚互为镜像：一个找父亲，一个躲父亲。',
      quests: [
        { id: 'q-sw-1', title: '取出白鹭号原始卷宗', type: 'main', status: 'done', involvedCharacterIds: [], note: '' },
        { id: 'q-sw-2', title: '保住母亲留下的房子', type: 'side', status: 'active', involvedCharacterIds: [], note: '' },
        { id: 'q-sw-3', title: '向林砚坦白父亲改过潮汐表', type: 'side', status: 'planned', involvedCharacterIds: ['c-linyan'], note: '' },
      ],
    },
    {
      id: 'c-zhou',
      name: '周启明',
      role: '反派',
      age: '56',
      tags: ['港务局长', '旧案核心', '体面人'],
      appearance: '银发梳得一丝不乱，常穿深色大衣，身上有淡淡的雪松香水味。',
      personality: '温和、体面、极有耐心。从不动怒，因为愤怒会让人露出破绽。',
      goal: '让十年前的那一页永远翻过去，保住雾港的秩序和自己的位置。',
      ultimateGoal: '让十年前那一页永远翻过去，保住港务局的控制权。',
      secret: '七只箱子里的人并没有全部离开雾港，有一个留了下来。',
      status: '主线',
      notes: '每次出场都带一样“干净”的物件：白手套、银打火机、擦亮的钥匙。',
      quests: [
        { id: 'q-zhou-1', title: '封锁暗礁水道', type: 'main', status: 'active', involvedCharacterIds: ['c-shenwu'], note: '' },
        { id: 'q-zhou-2', title: '拿回阿杰手里的旧船牌', type: 'side', status: 'planned', involvedCharacterIds: ['c-ajie'], note: '' },
      ],
    },
    {
      id: 'c-apoo',
      name: '阿婆',
      role: '导师',
      age: '80',
      tags: ['守塔人', '见证者', '雾港旧人'],
      appearance: '驼背，银发在脑后挽成一个小髻，手指关节粗大但异常稳定。',
      personality: '话少，记性极好。相信海会替人保管秘密，也相信秘密总有被潮水送回来的一天。',
      goal: '守住灯塔，直到该回来的人回来。',
      ultimateGoal: '守住灯塔，直到该回来的人回来。',
      secret: '她不是普通的守塔人，年轻时是白鹭号上的报务员。',
      status: '辅线',
      notes: '信息给出者，但每次只给一半，另一半要用行动换。',
      quests: [
        { id: 'q-apoo-1', title: '把十七号钥匙交给林砚', type: 'side', status: 'done', involvedCharacterIds: ['c-linyan'], note: '' },
      ],
    },
    {
      id: 'c-ajie',
      name: '阿杰',
      role: '配角',
      age: '17',
      tags: ['码头少年', '线人', '偷渡者后代'],
      appearance: '总戴一顶过大的雨帽，裤脚永远湿着，口袋里装着捡来的船牌。',
      personality: '机灵、嘴硬、重义气。对大人不信任，却愿意为朋友冒险。',
      goal: '攒够钱带妹妹离开雾港。',
      ultimateGoal: '攒够钱带妹妹离开雾港，在外海开一间自己的修船铺。',
      secret: '他的父亲是白鹭号上唯一留下来的那个人。',
      status: '支线',
      notes: '第二卷引入，负责把“十年前”与“现在”的线索接上。',
      quests: [
        { id: 'q-ajie-1', title: '凑齐两张去南边的船票', type: 'main', status: 'active', involvedCharacterIds: [], note: '' },
        { id: 'q-ajie-2', title: '帮林砚盯住周启明的人', type: 'side', status: 'active', involvedCharacterIds: ['c-linyan'], note: '' },
      ],
    },
  ],
  arcs: {
    'c-linyan': {
      stages: [
        { status: 'done', note: '在老邮局过着重复的日子，用工作回避父亲失踪的旧事。' },
        { status: 'done', note: '收到十年前的信，被要求去灯塔下面找。' },
        { status: 'done', note: '试图把信当成恶作剧，拒绝相信父亲可能还活着。' },
        { status: 'done', note: '阿婆给他十七号钥匙，并提醒他别相信潮汐表。' },
        { status: 'doing', note: '打开十七号储物柜，决定不再等别人给答案。' },
        { status: 'todo', note: '与沈雾、阿杰结成临时同盟，各自隐瞒一部分真相。' },
        { status: 'todo', note: '进入暗礁水道，面对父亲可能参与走私的事实。' },
        { status: 'todo', note: '选择把最后一封信送出去，而不是把真相留在自己手里。' },
      ],
    },
    'c-shenwu': {
      stages: [
        { status: 'done', note: '在港务局档案室维持秩序，假装父亲只是普通退休。' },
        { status: 'done', note: '林砚出现，旧案被迫重新翻开。' },
        { status: 'doing', note: '一边帮林砚找卷宗，一边销毁父亲留下的另一份证据。' },
        { status: 'todo', note: '承认父亲改过潮汐表，不再把赎罪推给下一代。' },
        { status: 'todo', note: '带林砚进入暗礁水道。' },
        { status: 'todo', note: '在周启明的 offer 与林砚的信任之间做选择。' },
        { status: 'todo', note: '面对母亲房子被收回的代价。' },
        { status: 'todo', note: '公开父亲留下的证词，留在雾港重建档案。' },
      ],
    },
    'c-zhou': {
      stages: [
        { status: 'done', note: '雾港体面的港务局长，所有人都说他救过这条港。' },
        { status: 'done', note: '林砚开始追查白鹭号，旧货主身份暴露。' },
        { status: 'done', note: '用体面话试探林砚，提出“过去的事就让它过去”。' },
        { status: 'done', note: '发现自己也被更上面的人盯着，开始不择手段。' },
        { status: 'doing', note: '封锁暗礁水道，准备把最后一批证据永远留在水下。' },
        { status: 'todo', note: '与阿杰父亲对峙，暴露出十年前真正的交易。' },
        { status: 'todo', note: '失去港务局的控制权。' },
        { status: 'todo', note: '在灯塔下做出最后一次选择：灭灯，或让灯亮着。' },
      ],
    },
  },
  locations: [
    { id: 'l-post', name: '老邮局', type: '建筑', x: 22, y: 62, description: '林砚工作的地方，地下分拣室还保留着十年前的邮袋架。', firstChapter: CH1 },
    { id: 'l-harbor', name: '雾港码头', type: '港口', x: 46, y: 48, description: '货船与渡轮共用，十七号仓库在尽头。', firstChapter: CH2 },
    { id: 'l-office', name: '港务局', type: '建筑', x: 58, y: 30, description: '沈雾工作的档案室在地下二层，潮气终年不散。', firstChapter: CH2 },
    { id: 'l-light', name: '白鹭灯塔', type: '地标', x: 78, y: 18, description: '雾港最北端，灯每十二秒扫过一次海面。', firstChapter: CH3 },
    { id: 'l-house', name: '沈家旧宅', type: '建筑', x: 34, y: 22, description: '沈雾母亲留下的房子，阁楼里有一台坏掉的收音机。', firstChapter: CH4 },
    { id: 'l-reef', name: '暗礁水道', type: '秘密', x: 70, y: 72, description: '退潮后才会露出的石阶，通向白鹭号藏身之处。', firstChapter: CH5 },
  ],
  mapLinks: [
    { id: 'ml-1', from: 'l-post', to: 'l-harbor', label: '送信路线' },
    { id: 'ml-2', from: 'l-harbor', to: 'l-office', label: '石阶' },
    { id: 'ml-3', from: 'l-office', to: 'l-light', label: '海岸路' },
    { id: 'ml-4', from: 'l-light', to: 'l-reef', label: '退潮后可见' },
    { id: 'ml-5', from: 'l-harbor', to: 'l-reef', label: '走私水道' },
    { id: 'ml-6', from: 'l-post', to: 'l-house', label: '旧邮路' },
  ],
  events: [
    { id: 'e-1', title: '白鹭号失踪', storyTime: '十年前 · 十月初七', type: '背景', importance: '高', chapterPath: CH2, description: '雾夜，载有七箱“货物”的邮船白鹭号失踪，七人推定遇难。' },
    { id: 'e-2', title: '林砚收到旧信', storyTime: '现在 · 第一天清晨', type: '开端', importance: '高', chapterPath: CH1, characterIds: ['c-linyan'], description: '盖着十年前邮戳的信出现在邮袋里，只有一句话：潮退的时候，去灯塔下面找。' },
    { id: 'e-3', title: '档案室会面', storyTime: '现在 · 第一天夜里', type: '调查', importance: '中', chapterPath: CH2, characterIds: ['c-linyan', 'c-shenwu'], description: '沈雾把白鹭号卷宗交给林砚，并透露父亲写过“船没有沉”。' },
    { id: 'e-4', title: '阿婆交出钥匙', storyTime: '现在 · 第二天黄昏', type: '转折', importance: '高', chapterPath: CH3, characterIds: ['c-linyan', 'c-apoo'], description: '守塔人阿婆把刻着 17 的铜钥匙交给林砚，并警告他别相信潮汐表。' },
    { id: 'e-5', title: '十七号柜被截', storyTime: '现在 · 第三天凌晨', type: '危机', importance: '高', chapterPath: CH4, characterIds: ['c-linyan', 'c-zhou'], description: '林砚在仓库找到父亲日志，被周启明带人堵住。' },
    { id: 'e-6', title: '暗礁水道开启', storyTime: '现在 · 第三天退潮', type: '高潮前夜', importance: '高', chapterPath: CH5, characterIds: ['c-linyan', 'c-shenwu'], description: '沈雾带林砚找到通往白鹭号藏身处的石阶。' },
  ],
  relationships: [
    { id: 'r-1', from: 'c-linyan', to: 'c-shenwu', type: '爱情', strength: 4, description: '从互相试探到共同背负旧案；信任每增加一分，隐瞒的代价也增加一分。' },
    { id: 'r-2', from: 'c-linyan', to: 'c-zhou', type: '对立', strength: 5, description: '杀父疑凶与旧案之子。周启明始终用长辈的姿态说话。' },
    { id: 'r-3', from: 'c-shenwu', to: 'c-zhou', type: '利益', strength: 3, description: '上下级。沈雾用档案权限换取母亲房子的保留。' },
    { id: 'r-4', from: 'c-apoo', to: 'c-linyan', type: '师徒', strength: 3, description: '阿婆认得林砚父亲，也认得林砚身上的那股执拗。' },
    { id: 'r-5', from: 'c-apoo', to: 'c-zhou', type: '隐瞒', strength: 4, description: '阿婆知道周启明的底细，却因当年的一桩旧恩保持沉默。' },
    { id: 'r-6', from: 'c-ajie', to: 'c-linyan', type: '盟友', strength: 2, description: '阿杰偷听到周启明的人谈话，成为林砚在码头的眼睛。' },
  ],
  items: [
    { id: 'i-1', name: '铜钥匙', type: '信物', ownerId: 'c-linyan', status: '持有中', significance: '高', description: '柄上刻着 17，可打开旧码头十七号储物柜。阿婆保存了十年。', firstChapter: CH3 },
    { id: 'i-2', name: '潮汐日志', type: '证据', ownerId: 'c-linyan', status: '持有中', significance: '高', description: '林砚父亲的航海日志。关键一页被撕，但压痕留下了线索。', firstChapter: CH4 },
    { id: 'i-3', name: '未寄出的信', type: '信物', ownerId: 'c-linyan', status: '未送达', significance: '高', description: '父亲写给林砚的信，藏在暗礁石室。是全书的情感核心。', firstChapter: CH6 },
    { id: 'i-4', name: '银色打火机', type: '人物物件', ownerId: 'c-zhou', status: '持有中', significance: '中', description: '周启明从不离身。底部刻着白鹭号的船号，是旧案物证。', firstChapter: CH4 },
    { id: 'i-5', name: '旧船牌', type: '线索', ownerId: 'c-ajie', status: '遗失', significance: '中', description: '阿杰父亲留下的船牌，编号与白鹭号货舱记录吻合。', firstChapter: CH5 },
  ],
  plotlines: [
    { id: 'p-1', title: '白鹭号失踪之谜', kind: 'main', status: '进行中', progress: 40, startChapter: CH1, endChapter: CH6, description: '明线：一封信引出的旧案调查。每卷回答一个问题，同时抛出下一个问题。' },
    { id: 'p-2', title: '林砚父亲的旧案', kind: 'sub', status: '进行中', progress: 55, startChapter: CH2, endChapter: CH6, description: '暗线：父亲是受害者、参与者，还是守护者？真相层层剥开。' },
    { id: 'p-3', title: '沈雾的赎罪', kind: 'sub', status: '进行中', progress: 30, startChapter: CH2, endChapter: CH6, description: '暗线：沈雾替父亲隐瞒，也替父亲赎罪。她与林砚的信任是本卷情感引擎。' },
  ],
  foreshadows: [
    { id: 'f-1', title: '“别相信潮汐表”', plantedChapter: CH3, payoffChapter: CH5, status: '已回收', importance: '高', description: '阿婆的警告。第五章揭示沈雾父亲篡改过潮汐表。' },
    { id: 'f-2', title: '白鹭火漆', plantedChapter: CH1, payoffChapter: CH6, status: '已回收', importance: '高', description: '信封印着白鹭号船徽。第六章揭示信是父亲在船上写的。' },
    { id: 'f-3', title: '阿杰的旧船牌', plantedChapter: CH5, payoffChapter: CH6, status: '已埋设', importance: '中', description: '船牌编号与货舱记录吻合，指向阿杰父亲是当年留下来的人。' },
    { id: 'f-4', title: '灯塔的第十二秒', plantedChapter: CH3, payoffChapter: CH6, status: '已埋设', importance: '高', description: '灯塔每十二秒扫过一次，是给水下的人看的信号。' },
    { id: 'f-5', title: '周启明的银打火机', plantedChapter: CH4, payoffChapter: CH6, status: '未埋设', importance: '中', description: '打火机底部的船号能把他与白鹭号直接连起来。' },
  ],
  hooks: [
    { id: 'h-1', title: '雾里的汽笛', chapterPath: CH1, type: '悬念', status: '已引爆', content: '信出现后，雾里传来一声拖长的汽笛，像有人在喊林砚的名字。', note: '第一章结尾钩子，直接把读者带进旧案。' },
    { id: 'h-2', title: '门外脚步声', chapterPath: CH2, type: '危机', status: '已引爆', content: '沈雾刚藏好卷宗，地下档案室外就响起了脚步声。', note: '第二章结尾，制造“被监视”的压迫感。' },
    { id: 'h-3', title: '三下敲门声', chapterPath: CH3, type: '恐怖', status: '已引爆', content: '灯塔下方传来三下缓慢的敲门声，像有什么从海底走上来。', note: '第三章结尾，恐怖与悬念叠加。' },
    { id: 'h-4', title: '周启明的钥匙', chapterPath: CH4, type: '反转', status: '已引爆', content: '周启明手里也有一枚十七号钥匙，他早就知道柜子里有什么。', note: '第四章结尾，反派从被动变主动。' },
    { id: 'h-5', title: '石阶下的闷响', chapterPath: CH5, type: '危机', status: '已引爆', content: '暗礁石阶下传来一声又一声铁门撞击，不是风。', note: '第五章结尾，推向高潮。' },
    { id: 'h-6', title: '十年前的那声汽笛', chapterPath: CH6, type: '情感', status: '待引爆', content: '雾里再次响起十年前的汽笛，父亲的声音说：潮退了，来灯塔下面找。', note: '全书结尾钩子，留给第二部。' },
  ],
  chapterMeta: {
    [CH1]: { status: '已完成', tension: 3, note: '开篇要慢，用雾和邮局建立氛围；结尾第一次汽笛。' },
    [CH2]: { status: '已完成', tension: 5, note: '信息章，用沈雾的隐瞒制造第一层不信任。' },
    [CH3]: { status: '修改中', tension: 6, note: '阿婆出场，给钥匙；灯塔敲门声要更克制。' },
    [CH4]: { status: '草稿', tension: 7, note: '动作章，仓库对峙；周启明第一次正面施压。' },
    [CH5]: { status: '草稿', tension: 9, note: '本卷最高点，暗礁水道开启；沈雾坦白一半。' },
    [CH6]: { status: '大纲', tension: 8, note: '收束卷，不开新坑；父亲的信要留白。' },
  },
}
