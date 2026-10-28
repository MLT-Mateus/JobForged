"""Preserve Compose replacement semantics when editing existing overrides."""
import yaml

class TaggedSequence(list):
    def __init__(self, values, tag):
        super().__init__(values)
        self.tag=tag

class Loader(yaml.SafeLoader):pass
class Dumper(yaml.SafeDumper):pass

def tagged_sequence(loader,node):
    if not isinstance(node,yaml.SequenceNode):
        raise yaml.constructor.ConstructorError(None,None,'Unsupported Compose tag shape',node.start_mark)
    return TaggedSequence(loader.construct_sequence(node,deep=True),node.tag)

for tag in ('!override','!reset'):Loader.add_constructor(tag,tagged_sequence)
Dumper.add_representer(TaggedSequence,lambda dumper,value:dumper.represent_sequence(value.tag,list(value)))

def load(document):return yaml.load(document,Loader=Loader)
def dump(document):return yaml.dump(document,Dumper=Dumper,sort_keys=False)
